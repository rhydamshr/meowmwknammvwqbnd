import { Droplets } from 'lucide-react';

interface ParticleDisplayProps {
  pm25?: number;
  pm10?: number;
  co2?: number;
}

export function ParticleDisplay({ pm25, pm10, co2 }: ParticleDisplayProps) {
  return (
    <div className="rounded-2xl shadow-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
          <Droplets className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold">Particulate Matter</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/10 backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-white/80">PM2.5</p>
            <p className="text-2xl font-bold">{pm25 !== undefined ? pm25.toFixed(1) : '--'}</p>
          </div>
          <span className="text-sm font-medium text-white/80">µg/m³</span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/10 backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-white/80">PM10</p>
            <p className="text-2xl font-bold">{pm10 !== undefined ? pm10.toFixed(1) : '--'}</p>
          </div>
          <span className="text-sm font-medium text-white/80">µg/m³</span>
        </div>

        {co2 !== undefined && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <div>
              <p className="text-sm font-medium text-white/80">CO₂</p>
              <p className="text-2xl font-bold">{co2.toFixed(0)}</p>
            </div>
            <span className="text-sm font-medium text-white/80">ppm</span>
          </div>
        )}
      </div>
    </div>
  );
}
