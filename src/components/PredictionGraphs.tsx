import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { PredictionData, HistoricalDataPoint } from '../types';
import { TrendingUp, Activity } from 'lucide-react';

const DISPLAY_TIME_OFFSET_MS = 2 * 60 * 60 * 1000; // +2 hours

interface PredictionGraphsProps {
  historicalData: HistoricalDataPoint[];
  predictions: PredictionData[];
  lastPredictionTime: Date | null;
}

export function PredictionGraphs({
  historicalData,
  predictions,
  lastPredictionTime,
}: PredictionGraphsProps) {
  const formatTime = (timeMs: number) =>
    new Date(timeMs + DISPLAY_TIME_OFFSET_MS).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const historicalChartData = historicalData.map((point) => {
    const time = new Date(point.timestamp).getTime();
    return {
      time,
      label: formatTime(time),
      ppm: point.ppm,
      temperature: point.temperature,
    };
  });

  const predictionChartData = predictions.map((point) => {
    const time = new Date(point.timestamp).getTime();
    return {
      time,
      label: formatTime(time),
      ppm: point.ppm,
      temperature: point.temperature,
    };
  });

  const combinedData = [...historicalChartData, ...predictionChartData].sort((a, b) => a.time - b.time);

  const predictionWindowStart = predictionChartData[0]?.label;
  const predictionWindowEnd = predictionChartData[predictionChartData.length - 1]?.label;
  const lastHistoricalLabel = historicalChartData.length
    ? historicalChartData[historicalChartData.length - 1].label
    : null;

  const referenceLineTime =
    lastPredictionTime?.getTime() ??
    predictionChartData[0]?.time ??
    historicalChartData[historicalChartData.length - 1]?.time ??
    Date.now();

  const renderMetricChart = (
    title: string,
    dataKey: 'ppm' | 'temperature',
    stroke: string,
  ) => (
    <div className="bg-white rounded-2xl shadow-lg p-6" key={dataKey}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTime}
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine x={referenceLineTime} stroke="#22c55e" strokeDasharray="3 3" label="Now" />
          {historicalChartData.length > 0 && (
            <Line
              type="monotone"
              dataKey={dataKey}
              data={historicalChartData}
              stroke={stroke}
              strokeWidth={2}
              dot={false}
              name={`Predicted ${title}`}
            />
          )}
          {predictionChartData.length > 0 && (
            <Line
              type="monotone"
              dataKey={dataKey}
              data={predictionChartData}
              stroke={stroke}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name={`Predicted ${title}`}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formattedLabel =
        typeof label === 'number' ? formatTime(label) : label;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-700 mb-2">{formattedLabel}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value?.toFixed(1)}{' '}
              {entry.dataKey === 'temperature' ? '°C' : 'ppm'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">2-Hour Predictions</h2>
            {/* <p className="text-sm text-slate-600">
              {lastPredictionTime 
                ? `Last updated: ${lastPredictionTime.toLocaleTimeString()}`
                : 'Waiting for prediction data...'}
            </p> */}
            {predictionWindowStart && predictionWindowEnd && (
              <p className="text-xs text-slate-500">
                Forecast window: {predictionWindowStart} → {predictionWindowEnd}
              </p>
            )}
          </div>
        </div>
        {lastHistoricalLabel && (
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white shadow border border-slate-100">
            <div className="p-2 rounded-xl bg-slate-100">
              <Activity className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Live sensor</p>
              <p className="text-sm text-slate-600">
                Last reading {lastHistoricalLabel}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Metric charts */}
      {renderMetricChart('PPM (Air Quality)', 'ppm', '#8b5cf6')}
      {renderMetricChart('Temperature', 'temperature', '#f97316')}

      {/* Prediction Summary Cards */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
            <p className="text-sm font-medium opacity-90 mb-1">Avg Predicted PPM</p>
            <p className="text-2xl font-bold">
              {Math.round(predictions.reduce((sum, p) => sum + p.ppm, 0) / predictions.length)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white">
            <p className="text-sm font-medium opacity-90 mb-1">Avg Predicted Temp</p>
            <p className="text-2xl font-bold">
              {(predictions.reduce((sum, p) => sum + p.temperature, 0) / predictions.length).toFixed(1)}°C
            </p>
          </div>
        
        </div>
      )}

    </div>
  );
}

