import { Wind } from 'lucide-react';
import { getAQIStatus } from '../utils/dataProcessing';

interface AQIDisplayProps {
  aqi?: number;
}

export function AQIDisplay({ aqi }: AQIDisplayProps) {
  const status = getAQIStatus(aqi);

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="flex items-center gap-6">
        <div className={`p-4 rounded-2xl ${status.bg}`}>
          <Wind className={`w-12 h-12 ${status.color}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">Air Quality Index</p>
          <p className="text-5xl font-bold text-slate-900 mb-2">
            {aqi !== undefined ? Math.round(aqi) : '--'}
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${status.bg}`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`}></div>
            <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br from-slate-200/30 to-transparent rounded-full blur-2xl"></div>
    </div>
  );
}
