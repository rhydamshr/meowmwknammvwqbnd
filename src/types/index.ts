export interface SensorReading {
  topic: string;
  payload: {
    temperature?: number;
    humidity?: number;
    aqi?: number;
    co2?: number;
    pm25?: number;
    pm10?: number;
    raw?: string;
  };
  timestamp: string;
}
