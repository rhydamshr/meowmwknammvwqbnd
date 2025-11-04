import { Activity, RefreshCw } from 'lucide-react';
import { formatTimestamp } from '../utils/dataProcessing';

interface HeaderProps {
  lastUpdate?: string;
  isLoading: boolean;
}

export function Header({ lastUpdate, isLoading }: HeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Environmental Monitor</h1>
          <p className="text-sm text-slate-600 mt-1">Real-time sensor data dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-600">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Updating...</span>
          </div>
        ) : lastUpdate ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-medium">Last update: {formatTimestamp(lastUpdate)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
