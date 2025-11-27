import { useState, useEffect, useRef, useCallback } from 'react';
import { SensorReading, PredictionData, HistoricalDataPoint } from '../types';
import { generateInitialData } from '../utils/generateInitialData';

const BACKEND_URL = 'http://13.203.159.89:5000';
const PREDICT_URL = 'http://127.0.0.1:5000'; // predict.py backend
const PAST_HOURS = 2;
const PREDICTION_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const DATA_FETCH_INTERVAL = 5 * 1000*60; // 5 seconds
const RESAMPLE_INTERVAL_MS = 30 * 1000;
const MIN_DATA_POINTS_FOR_PREDICTION = 240; // 2 hours at 30-second intervals
const WINDOW_DURATION_MS = RESAMPLE_INTERVAL_MS * (MIN_DATA_POINTS_FOR_PREDICTION - 1);

export function usePredictions() {
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [predictionHistory, setPredictionHistory] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPredictionTime, setLastPredictionTime] = useState<Date | null>(null);
  const predictionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataFetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialPredictionFetched = useRef(false);
  const syntheticModeRef = useRef(false);

  // Extract data point from sensor reading
  const extractDataPoint = useCallback((reading: SensorReading): HistoricalDataPoint | null => {
    const payload = reading.payload;
    const ppm = payload.ppm ?? payload.aqi ?? payload.co2;
    const temperature = payload.temperature;
    const humidity = payload.humidity;

    if (ppm === undefined || temperature === undefined || humidity === undefined) {
      return null;
    }

    return {
      timestamp: reading.timestamp,
      ppm: Number(ppm),
      temperature: Number(temperature),
      humidity: Number(humidity),
    };
  }, []);

  const mergeWithSynthetic = useCallback((syntheticData: HistoricalDataPoint[], realData: HistoricalDataPoint[]) => {
    const combined = [...syntheticData];
    realData.forEach((realPoint) => {
      const realTime = new Date(realPoint.timestamp).getTime();
      const existingIndex = combined.findIndex((syntheticPoint) => {
        const syntheticTime = new Date(syntheticPoint.timestamp).getTime();
        return Math.abs(syntheticTime - realTime) < 60000; // within 1 minute
      });

      if (existingIndex >= 0) {
        combined[existingIndex] = realPoint;
      } else {
        combined.push(realPoint);
      }
    });

    return combined
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-MIN_DATA_POINTS_FOR_PREDICTION);
  }, []);

const buildResampledWindow = (data: HistoricalDataPoint[]): HistoricalDataPoint[] => {
  if (!data.length) return [];

  const sorted = [...data]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((point) => ({
      ...point,
      time: new Date(point.timestamp).getTime(),
    }));

  const latestTime = Math.max(Date.now(), sorted[sorted.length - 1].time);
  const startTime = latestTime - WINDOW_DURATION_MS;

  const resampled: HistoricalDataPoint[] = [];
  let pointer = 0;

  for (let i = 0; i < MIN_DATA_POINTS_FOR_PREDICTION; i++) {
    const slotTime = startTime + i * RESAMPLE_INTERVAL_MS;

    while (pointer < sorted.length - 1 && sorted[pointer + 1].time <= slotTime) {
      pointer++;
    }

    const current = sorted[pointer];
    const next = sorted[pointer + 1];

    let ppm = current.ppm;
    let temperature = current.temperature;
    let humidity = current.humidity;

    if (
      next &&
      slotTime > current.time &&
      slotTime < next.time &&
      next.time !== current.time
    ) {
      const ratio = (slotTime - current.time) / (next.time - current.time);
      ppm = current.ppm + (next.ppm - current.ppm) * ratio;
      temperature = current.temperature + (next.temperature - current.temperature) * ratio;
      humidity = current.humidity + (next.humidity - current.humidity) * ratio;
    }

    resampled.push({
      timestamp: new Date(slotTime).toISOString(),
      ppm,
      temperature,
      humidity,
    });
  }

  return resampled;
};

  // Fetch data from backend and ensure we always end at "now"
  const fetchHistoricalData = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/messages?limit=1000`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const messages: SensorReading[] = await response.json();

      const dataPoints = messages
        .map(extractDataPoint)
        .filter((point): point is HistoricalDataPoint => point !== null)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const twoHoursAgo = new Date(Date.now() - PAST_HOURS * 60 * 60 * 1000);
      const recentData = dataPoints.filter(
        (point) => new Date(point.timestamp).getTime() >= twoHoursAgo.getTime()
      );

      let finalData: HistoricalDataPoint[];

      if (recentData.length < MIN_DATA_POINTS_FOR_PREDICTION) {
        const syntheticData = await generateInitialData();
        finalData = mergeWithSynthetic(syntheticData, recentData);
        syntheticModeRef.current = true;
      } else {
        finalData = recentData.slice(-MIN_DATA_POINTS_FOR_PREDICTION);
        syntheticModeRef.current = false;
      }

      setHistoricalData(finalData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching historical data:', err);

      try {
        const syntheticData = await generateInitialData();
        setHistoricalData(syntheticData);
        syntheticModeRef.current = true;
      } catch (synthErr) {
        console.error('Error loading synthetic data:', synthErr);
      }
    }
  }, [extractDataPoint, mergeWithSynthetic]);

  // Call prediction API
  const fetchPredictions = useCallback(async () => {
    try {
      // Get the last 2 hours of data
      const recentData = historicalData;

      if (recentData.length === 0) {
        console.warn('No historical data available for prediction');
        return;
      }

      const resampledWindow = buildResampledWindow(recentData);

      if (resampledWindow.length < MIN_DATA_POINTS_FOR_PREDICTION) {
        console.warn('Resampled window is incomplete, skipping prediction run');
        return;
      }

      // Format data for prediction API
      const predictionPayload = resampledWindow.map((point) => ({
        timestamp: point.timestamp,
        ppm: point.ppm,
        temperature: point.temperature,
        humidity: point.humidity,
      }));

      const response = await fetch(`${PREDICT_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: predictionPayload }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.predictions && Array.isArray(result.predictions)) {
        setPredictions(result.predictions);
        setPredictionHistory(resampledWindow);
        setLastPredictionTime(new Date());
        setError(null);
      } else {
        throw new Error('Invalid prediction response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching predictions:', err);
    }
  }, [historicalData]);

  // Initial data fetch - seed with synthetic data, then pull real data
  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true);
      try {
        const syntheticData = await generateInitialData();
        setHistoricalData(syntheticData);
        syntheticModeRef.current = true;
      } catch (err) {
        console.error('Error loading initial synthetic data:', err);
      }

      await fetchHistoricalData();
      setLoading(false);
    };
    initialFetch();
  }, [fetchHistoricalData]);

  // Set up data fetching interval (every 5 seconds)
  useEffect(() => {
    dataFetchIntervalRef.current = setInterval(fetchHistoricalData, DATA_FETCH_INTERVAL);
    return () => {
      if (dataFetchIntervalRef.current) {
        clearInterval(dataFetchIntervalRef.current);
      }
    };
  }, [fetchHistoricalData]);

  // Set up prediction interval (every 5 minutes)
  useEffect(() => {
    // Fetch predictions immediately if we have data and haven't fetched yet
    if (historicalData.length > 0 && !initialPredictionFetched.current) {
      fetchPredictions();
      initialPredictionFetched.current = true;
    }

    // Set up interval
    predictionIntervalRef.current = setInterval(() => {
      if (historicalData.length > 0) {
        fetchPredictions();
      }
    }, PREDICTION_INTERVAL);

    return () => {
      if (predictionIntervalRef.current) {
        clearInterval(predictionIntervalRef.current);
      }
    };
  }, [historicalData, fetchPredictions]);

  return {
    historicalData,
    predictionHistory,
    predictions,
    loading,
    error,
    lastPredictionTime,
  };
}

