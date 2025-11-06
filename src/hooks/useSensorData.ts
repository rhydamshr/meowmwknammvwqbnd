import { useState, useEffect } from 'react';
import { SensorReading } from '../types';

const BACKEND_URL = 'http://3.110.54.193:5000';

export function useSensorData(refreshInterval = 5000) {
  const [data, setData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/messages?limit=100`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const messages = await response.json();
        setData(messages);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, loading, error };
}
