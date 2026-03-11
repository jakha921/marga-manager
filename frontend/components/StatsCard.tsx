import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, trend }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-card flex flex-col items-start justify-between h-full transition-all duration-300 hover:shadow-lg border border-transparent hover:border-slate-100 group">
      <div className="w-full flex items-center justify-between mb-4">
        <h3 className="font-display text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </h3>
        {trend && (
           <span className={`
             flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full
             ${trend.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}
           `}>
             {trend.isPositive ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownRight size={10} strokeWidth={3} />}
             {trend.value}%
           </span>
        )}
      </div>
      
      <div className="font-display font-bold text-4xl text-slate-900 tracking-tight mb-2 group-hover:scale-[1.02] transition-transform origin-left">
        {value}
      </div>
      
      <div className="font-body text-xs font-medium text-slate-500 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
        {subtitle}
      </div>
    </div>
  );
};

export default StatsCard;