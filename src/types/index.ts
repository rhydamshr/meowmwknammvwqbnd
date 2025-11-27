export interface SensorReading {
  topic: string;
  payload: {
    temperature?: number;
    humidity?: number;
    aqi?: number;
    co2?: number;
    pm25?: number;
    pm10?: number;
    ppm?: number;
    raw?: string;
  };
  timestamp: string;
}

export interface PredictionData {
  timestamp: string;
  ppm: number;
  temperature: number;
  humidity: number;
}

export interface HistoricalDataPoint {
  timestamp: string;
  ppm: number;
  temperature: number;
  humidity: number;
}
