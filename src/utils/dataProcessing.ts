import { SensorReading } from '../types';

export function getLatestReadings(data: SensorReading[]) {
  if (!data.length) return null;

  const latest = data[0];
  return {
    temperature: latest.payload.temperature,
    humidity: latest.payload.humidity,
    aqi: latest.payload.aqi ?? latest.payload.ppm,
    co2: latest.payload.co2,
    pm25: latest.payload.pm25,
    pm10: latest.payload.pm10,
    timestamp: latest.timestamp,
  };
}

export function getAQIStatus(aqi?: number) {
  if (!aqi) return { label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-100' };
  if (aqi <= 50) return { label: 'Good', color: 'text-green-600', bg: 'bg-green-50' };
  if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: 'text-orange-600', bg: 'bg-orange-50' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'text-red-600', bg: 'bg-red-50' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: 'text-purple-600', bg: 'bg-purple-50' };
  return { label: 'Hazardous', color: 'text-rose-700', bg: 'bg-rose-50' };
}

export function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}
