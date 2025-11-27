import { Thermometer, Droplet } from 'lucide-react';
import { useSensorData } from './hooks/useSensorData';
import { usePredictions } from './hooks/usePredictions';
import { getLatestReadings } from './utils/dataProcessing';
import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { AQIDisplay } from './components/AQIDisplay';
import { ParticleDisplay } from './components/ParticleDisplay';
import { ErrorDisplay } from './components/ErrorDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PredictionGraphs } from './components/PredictionGraphs';

function App() {
  const { data, loading, error } = useSensorData(5000);
  const {
    historicalData,
    predictionHistory,
    predictions,
    loading: predictionsLoading,
    error: predictionsError,
    lastPredictionTime,
  } = usePredictions();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  const latest = getLatestReadings(data);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header lastUpdate={latest?.timestamp} isLoading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <AQIDisplay aqi={latest?.aqi} />
          </div>
          {/* <div>
            <ParticleDisplay
              pm25={latest?.pm25}
              pm10={latest?.pm10}
              co2={latest?.co2}
            />
          </div> */}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title="Temperature"
            value={latest?.temperature}
            unit="°C"
            icon={Thermometer}
            iconColor="text-orange-500"
            bgGradient="bg-gradient-to-br from-orange-400 to-red-500"
          />
          <MetricCard
            title="Humidity"
            value={latest?.humidity}
            unit="%"
            icon={Droplet}
            iconColor="text-blue-500"
            bgGradient="bg-gradient-to-br from-blue-400 to-cyan-500"
          />
        </div>

        {/* Prediction Section */}
        <div className="mb-8">
          {predictionsError && (
            <div className="mb-4">
              <ErrorDisplay message={`Prediction error: ${predictionsError}`} />
            </div>
          )}
          <PredictionGraphs
            historicalData={predictionHistory.length ? predictionHistory : historicalData}
            predictions={predictions}
            lastPredictionTime={lastPredictionTime}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
