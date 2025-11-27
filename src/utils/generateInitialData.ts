import { HistoricalDataPoint } from '../types';

const TOTAL_POINTS = 240; // matches model expectation (2 hours at 30-second resolution)
const RESAMPLE_MS = 30 * 1000;

// Generate 2 hours of synthetic data based on sensor_data.json patterns
export async function generateInitialData(): Promise<HistoricalDataPoint[]> {
  try {
    // Try to fetch sensor_data.json from public folder or use default patterns
    const response = await fetch('/sensor_data.json');
    let sensorData: any[] = [];
    
    if (response.ok) {
      sensorData = await response.json();
    }

    // If we have sensor data, use it to generate synthetic data
    if (sensorData.length > 0) {
      // Get the last few data points to use as a base
      const recentData = sensorData.slice(-10);
      
      // Calculate average and trends
      const avgPpm = recentData.reduce((sum, d) => sum + (d.payload?.ppm || d.payload?.aqi || 0), 0) / recentData.length;
      const avgTemp = recentData.reduce((sum, d) => sum + (d.payload?.temperature || 0), 0) / recentData.length;
      const avgHumidity = recentData.reduce((sum, d) => sum + (d.payload?.humidity || 0), 0) / recentData.length;

      // Calculate variance for realistic variation
      const ppmVariance = recentData.reduce((sum, d) => {
        const val = d.payload?.ppm || d.payload?.aqi || 0;
        return sum + Math.pow(val - avgPpm, 2);
      }, 0) / recentData.length;
      const tempVariance = recentData.reduce((sum, d) => {
        const val = d.payload?.temperature || 0;
        return sum + Math.pow(val - avgTemp, 2);
      }, 0) / recentData.length;
      const humidityVariance = recentData.reduce((sum, d) => {
        const val = d.payload?.humidity || 0;
        return sum + Math.pow(val - avgHumidity, 2);
      }, 0) / recentData.length;

      // Generate data ending at the current time with 240 samples spaced ~30 seconds apart
      const dataPoints: HistoricalDataPoint[] = [];
      const now = new Date();
      const startTime = new Date(now.getTime() - (TOTAL_POINTS - 1) * RESAMPLE_MS);

      for (let i = 0; i < TOTAL_POINTS; i++) {
        const timestamp = new Date(startTime.getTime() + i * RESAMPLE_MS);
        
        // Add some realistic variation with slight trends
        const timeFactor = i / (TOTAL_POINTS - 1); // 0 to 1
        const randomPpm = (Math.random() - 0.5) * 2 * Math.sqrt(ppmVariance);
        const randomTemp = (Math.random() - 0.5) * 2 * Math.sqrt(tempVariance);
        const randomHumidity = (Math.random() - 0.5) * 2 * Math.sqrt(humidityVariance);
        
        // Add slight sinusoidal variation to make it more realistic
        const sineWave = Math.sin((timeFactor * Math.PI * 4) + Math.random() * 0.5);
        
        dataPoints.push({
          timestamp: timestamp.toISOString(),
          ppm: Math.max(0, Math.round(avgPpm + randomPpm + sineWave * 10)),
          temperature: Math.round((avgTemp + randomTemp + sineWave * 0.5) * 10) / 10,
          humidity: Math.max(0, Math.min(100, Math.round((avgHumidity + randomHumidity + sineWave * 2) * 10) / 10)),
        });
      }

      return dataPoints;
    } else {
      // Fallback: generate data with default reasonable values
      return generateDefaultData();
    }
  } catch (error) {
    console.warn('Could not load sensor_data.json, using default synthetic data:', error);
    return generateDefaultData();
  }
}

function generateDefaultData(): HistoricalDataPoint[] {
  const dataPoints: HistoricalDataPoint[] = [];
  const now = new Date();
  const startTime = new Date(now.getTime() - (TOTAL_POINTS - 1) * RESAMPLE_MS);

  // Default values: ppm ~300, temp ~25°C, humidity ~50%
  for (let i = 0; i < TOTAL_POINTS; i++) {
    const timestamp = new Date(startTime.getTime() + i * RESAMPLE_MS);
    const timeFactor = i / (TOTAL_POINTS - 1);
    const sineWave = Math.sin(timeFactor * Math.PI * 4);
    
    dataPoints.push({
      timestamp: timestamp.toISOString(),
      ppm: Math.round(300 + sineWave * 20 + (Math.random() - 0.5) * 30),
      temperature: Math.round((25 + sineWave * 2 + (Math.random() - 0.5) * 1) * 10) / 10,
      humidity: Math.max(0, Math.min(100, Math.round((50 + sineWave * 5 + (Math.random() - 0.5) * 3) * 10) / 10)),
    });
  }

  return dataPoints;
}

