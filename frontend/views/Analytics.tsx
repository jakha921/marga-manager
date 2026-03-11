
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils';
import Input from '../components/Input';
import Button from '../components/Button';
import Select from '../components/Select';
import { Download, Filter, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Analytics: React.FC = () => {
  const { kitchens, operations } = useData();
  const { t } = useLanguage();

  // Helper to get current month range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  };

  const { start: currentStart, end: currentEnd } = getCurrentMonthRange();

  // Filters with Persistence
  const [selectedKitchen, setSelectedKitchen] = useState(() => localStorage.getItem('anl_kitchen') || 'all');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('anl_start') || currentStart);
  const [endDate, setEndDate] = useState(() => localStorage.getItem('anl_end') || currentEnd);
  
  // Save filters to localStorage
  useEffect(() => localStorage.setItem('anl_kitchen', selectedKitchen), [selectedKitchen]);
  useEffect(() => localStorage.setItem('anl_start', startDate), [startDate]);
  useEffect(() => localStorage.setItem('anl_end', endDate), [endDate]);
  
  const analyticsData = useMemo(() => {
    const filteredOps = operations.filter(op => {
      const opDate = new Date(op.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const inDateRange = opDate >= start && opDate <= end;
      const inKitchen = selectedKitchen === 'all' || op.kitchenId === selectedKitchen;
      return inDateRange && inKitchen;
    });

    const kitchenStats = kitchens.map(k => {
      const kOps = filteredOps.filter(op => op.kitchenId === k.id);
      const incoming = kOps.filter(op => op.type === 'INCOMING').reduce((acc, curr) => acc + curr.quantity, 0);
      const salesQty = kOps.filter(op => op.type === 'SALE').reduce((acc, curr) => acc + curr.quantity, 0);
      // Correction: price is now stored as Total Price, not Unit Price
      const salesRevenue = kOps.filter(op => op.type === 'SALE').reduce((acc, curr) => acc + (curr.price || 0), 0);
      const dailyExpense = kOps.filter(op => op.type === 'DAILY').reduce((acc, curr) => acc + curr.quantity, 0);
      const transfers = kOps.filter(op => op.type === 'TRANSFER').reduce((acc, curr) => acc + curr.quantity, 0);
      const beginningBalance = 50 + (k.id.charCodeAt(0) % 10); 
      const actualExpense = dailyExpense + salesQty; 
      const endBalance = beginningBalance + incoming - actualExpense + transfers;
      const estimatedCost = salesRevenue * 0.4;
      const markupVal = salesRevenue - estimatedCost;
      const markupPercent = estimatedCost > 0 ? ((markupVal / estimatedCost) * 100).toFixed(1) : '0.0';

      return { id: k.id, name: k.name, beginningBalance, incoming, salesRevenue, actualExpense, endBalance, markupVal, markupPercent, transfers };
    });

    const displayedStats = selectedKitchen === 'all' ? kitchenStats : kitchenStats.filter(k => k.id === selectedKitchen);
    const chartMap = new Map<string, number>();
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        chartMap.set(d.toISOString().split('T')[0], 0);
    }
    filteredOps.filter(op => op.type === 'SALE').forEach(op => {
       const curr = chartMap.get(op.date) || 0;
       // Correction: price is Total Price
       chartMap.set(op.date, curr + (op.price || 0));
    });
    const chartData = Array.from(chartMap.entries()).map(([date, val]) => ({
        date: formatDate(date),
        value: val
    }));
    const totals = displayedStats.reduce((acc, curr) => ({
        beginningBalance: acc.beginningBalance + curr.beginningBalance,
        incoming: acc.incoming + curr.incoming,
        actualExpense: acc.actualExpense + curr.actualExpense,
        endBalance: acc.endBalance + curr.endBalance,
        salesRevenue: acc.salesRevenue + curr.salesRevenue,
        markupVal: acc.markupVal + curr.markupVal,
        transfers: acc.transfers + curr.transfers
    }), { beginningBalance: 0, incoming: 0, actualExpense: 0, endBalance: 0, salesRevenue: 0, markupVal: 0, transfers: 0 });

    return { displayedStats, chartData, totals, filteredOps };
  }, [operations, kitchens, selectedKitchen, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
         <div className="flex flex-col lg:flex-row items-end gap-6">
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
               <Select 
                 label={t('anl.kitchen_branch')}
                 options={[{ value: 'all', label: t('dash.filter.all_kitchens') }, ...kitchens.map(k => ({ value: k.id, label: k.name }))]}
                 value={selectedKitchen}
                 onChange={e => setSelectedKitchen(e.target.value)}
                 icon={<Filter size={16} />}
               />
               <Input label={t('anl.date_from')} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
               <Input label={t('anl.date_to')} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="flex gap-3 w-full lg:w-auto">
               <Button variant="secondary" className="flex-1 lg:w-auto text-emerald-700 bg-emerald-50 border-emerald-200">
                 <Download size={18} /> {t('anl.export')}
               </Button>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-50 rounded-xl">
               <TrendingUp size={20} className="text-slate-400" />
             </div>
             <h3 className="font-display font-bold text-lg text-slate-800">{t('anl.dept_analytics')}</h3>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">{t('anl.col.dept')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.start')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.in')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.exp')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.end')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.sales')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.mrk')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">%</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.trns')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {analyticsData.displayedStats.map(stat => (
                <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-xs text-slate-800">{stat.name}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{stat.beginningBalance}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{stat.incoming}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{stat.actualExpense}</td>
                  <td className="py-3 px-4 text-xs text-slate-800 font-bold text-right font-mono">{stat.endBalance}</td>
                  <td className="py-3 px-4 text-xs text-blue-600 font-medium text-right font-mono">{stat.salesRevenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-xs text-emerald-600 font-medium text-right font-mono">{stat.markupVal.toLocaleString()}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{stat.markupPercent}%</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{stat.transfers}</td>
                </tr>
              ))}
               <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                  <td className="py-3 px-4 text-xs text-slate-900">{t('anl.total')}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{analyticsData.totals.beginningBalance}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{analyticsData.totals.incoming}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{analyticsData.totals.actualExpense}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{analyticsData.totals.endBalance}</td>
                  <td className="py-3 px-4 text-xs text-blue-700 text-right font-mono">{analyticsData.totals.salesRevenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-xs text-emerald-700 text-right font-mono">{analyticsData.totals.markupVal.toLocaleString()}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">-</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{analyticsData.totals.transfers}</td>
               </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
         <div className="flex items-center gap-3 mb-6">
           <div className="p-2 bg-slate-50 rounded-xl">
             <CalendarIcon size={20} className="text-slate-400" />
           </div>
           <h3 className="font-display font-bold text-lg text-slate-800">{t('anl.sales_dynamics')}</h3>
         </div>
         <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{fontFamily: 'Inter', fontSize: 11}} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#94a3b8" tick={{fontFamily: 'Inter', fontSize: 11}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={0.1} fill="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default Analytics;
