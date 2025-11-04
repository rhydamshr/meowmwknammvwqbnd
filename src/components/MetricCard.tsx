import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | undefined;
  unit: string;
  icon: LucideIcon;
  iconColor: string;
  bgGradient: string;
}

export function MetricCard({ title, value, unit, icon: Icon, iconColor, bgGradient }: MetricCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg ${bgGradient} p-6 transition-all duration-300 hover:shadow-xl hover:scale-105`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80 mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-white">
              {value !== undefined ? value.toFixed(1) : '--'}
            </p>
            <span className="text-xl font-medium text-white/80">{unit}</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${iconColor} bg-white/20 backdrop-blur-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
    </div>
  );
}
