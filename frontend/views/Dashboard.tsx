
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, formatNumber, formatCompactNumber } from '../utils';
import { Filter, Download, TrendingUp, Calendar as CalendarIcon, BarChart3, LineChart, PieChart } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Select from '../components/Select';
import Input from '../components/Input';
import Button from '../components/Button';
import { analyticsService } from '../api/services/analytics';
import { KitchenReportEntry, KitchenReportResponse } from '../types';

const Dashboard: React.FC = () => {
  const { stats, operations, kitchens, products } = useData();
  const { t } = useLanguage();

  // Helper to get current month range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  };

  const { start: currentStart, end: currentEnd } = getCurrentMonthRange();

  // Unified Filters with Persistence
  const [selectedKitchen, setSelectedKitchen] = useState(() => localStorage.getItem('dash_kitchen') || 'all');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('dash_start') || currentStart);
  const [endDate, setEndDate] = useState(() => localStorage.getItem('dash_end') || currentEnd);
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative' | 'product'>('daily');

  // Product Chart specific filters
  const [prodHistStart, setProdHistStart] = useState(() => localStorage.getItem('dash_prod_start') || currentStart);
  const [prodHistEnd, setProdHistEnd] = useState(() => localStorage.getItem('dash_prod_end') || currentEnd);
  const [selectedProductId, setSelectedProductId] = useState(() => localStorage.getItem('dash_prod_id') || '');
  const [prodHistKitchen, setProdHistKitchen] = useState(() => localStorage.getItem('dash_prod_kitchen') || 'all');

  // Server-side kitchen report state
  const [reportData, setReportData] = useState<KitchenReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Save filters to localStorage
  useEffect(() => localStorage.setItem('dash_kitchen', selectedKitchen), [selectedKitchen]);
  useEffect(() => localStorage.setItem('dash_start', startDate), [startDate]);
  useEffect(() => localStorage.setItem('dash_end', endDate), [endDate]);
  useEffect(() => localStorage.setItem('dash_prod_start', prodHistStart), [prodHistStart]);
  useEffect(() => localStorage.setItem('dash_prod_end', prodHistEnd), [prodHistEnd]);
  useEffect(() => localStorage.setItem('dash_prod_id', selectedProductId), [selectedProductId]);
  useEffect(() => localStorage.setItem('dash_prod_kitchen', prodHistKitchen), [prodHistKitchen]);

  // Fetch kitchen report from server
  useEffect(() => {
    const fetchReport = async () => {
      setReportLoading(true);
      try {
        const params: Record<string, string> = {
          date_from: startDate,
          date_to: endDate,
        };
        if (selectedKitchen !== 'all') params.kitchen = selectedKitchen;
        const { data } = await analyticsService.getKitchenReport(params);
        setReportData(data);
      } catch {
        setReportData(null);
      } finally {
        setReportLoading(false);
      }
    };
    fetchReport();
  }, [startDate, endDate, selectedKitchen]);

  // Displayed table data from server
  const displayedTableStats = reportData?.kitchens ?? [];
  const tableTotals = reportData?.totals ?? {
    beginningBalance: 0, incoming: 0, actualExpense: 0, endBalance: 0,
    salesRevenue: 0, markupVal: 0, markupPercent: 0, transfersIn: 0, transfersOut: 0,
  };

  // Charts still computed on client (use operations from context)
  const chartData = useMemo(() => {
    const filteredOps = operations.filter(op => {
      const opDate = new Date(op.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const matchesDate = opDate >= start && opDate <= end;
      const matchesKitchen = selectedKitchen === 'all' || String(op.kitchenId) === selectedKitchen;
      return matchesDate && matchesKitchen;
    });

    // Daily Sales vs Cost chart
    const chartMap = new Map<string, { sales: number; cost: number }>();
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        chartMap.set(d.toISOString().split('T')[0], { sales: 0, cost: 0 });
    }

    filteredOps.filter(op => op.type === 'SALE').forEach(op => {
       const curr = chartMap.get(op.date) || { sales: 0, cost: 0 };
       chartMap.set(op.date, { ...curr, sales: curr.sales + (Number(op.price) || 0) });
    });

    filteredOps.filter(op => op.type === 'INCOMING').forEach(op => {
        const curr = chartMap.get(op.date) || { sales: 0, cost: 0 };
        chartMap.set(op.date, { ...curr, cost: curr.cost + (Number(op.price) || 0) });
    });

    const dailyChartData = Array.from(chartMap.entries()).map(([date, val]) => ({
        date: formatDate(date),
        sales: val.sales,
        cost: val.cost
    }));

    let runningSales = 0;
    let runningCost = 0;
    const cumulativeChartData = dailyChartData.map(item => {
        runningSales += item.sales;
        runningCost += item.cost;
        return { date: item.date, sales: runningSales, cost: runningCost };
    });

    // Product Expense Chart Data
    const productChartData: { date: string; value: number }[] = [];

    if (selectedProductId) {
        const pStart = new Date(prodHistStart);
        const pEnd = new Date(prodHistEnd);

        const getBalance = (dateStr: string) => {
            return operations
                .filter(op =>
                    String(op.productId) === selectedProductId &&
                    op.type === 'DAILY' &&
                    op.date === dateStr &&
                    (prodHistKitchen === 'all' || String(op.kitchenId) === prodHistKitchen)
                )
                .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
        };

        const getIncoming = (dateStr: string) => {
            return operations
                .filter(op =>
                    String(op.productId) === selectedProductId &&
                    op.type === 'INCOMING' &&
                    op.date === dateStr &&
                    (prodHistKitchen === 'all' || String(op.kitchenId) === prodHistKitchen)
                )
                .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
        };

        const getTransferOut = (dateStr: string) => {
            if (prodHistKitchen === 'all') return 0;
            return operations
                .filter(op =>
                    String(op.productId) === selectedProductId &&
                    op.type === 'TRANSFER' &&
                    op.date === dateStr &&
                    String(op.kitchenId) === prodHistKitchen
                )
                .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
        };

        const getTransferIn = (dateStr: string) => {
            if (prodHistKitchen === 'all') return 0;
            return operations
                .filter(op =>
                    String(op.productId) === selectedProductId &&
                    op.type === 'TRANSFER' &&
                    op.date === dateStr &&
                    String(op.toKitchenId) === prodHistKitchen
                )
                .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
        };

        for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const prevD = new Date(d);
            prevD.setDate(prevD.getDate() - 1);
            const prevDateStr = prevD.toISOString().split('T')[0];

            const prevBalance = getBalance(prevDateStr);
            const currBalance = getBalance(dateStr);
            const incoming = getIncoming(dateStr);
            const transferOut = getTransferOut(dateStr);
            const transferIn = getTransferIn(dateStr);

            let consumption = prevBalance + incoming - currBalance;
            if (prodHistKitchen !== 'all') {
                consumption = consumption + transferOut - transferIn;
            }

            productChartData.push({ date: formatDate(dateStr), value: consumption });
        }
    }

    return { dailyChartData, cumulativeChartData, productChartData };
  }, [operations, selectedKitchen, startDate, endDate, prodHistStart, prodHistEnd, selectedProductId, prodHistKitchen]);

  const showTransfers = kitchens.length > 1;

  // Excel Export via server
  const handleExport = useCallback(async () => {
    try {
      const params: Record<string, string> = {
        date_from: startDate,
        date_to: endDate,
      };
      if (selectedKitchen !== 'all') params.kitchen = selectedKitchen;
      const response = await analyticsService.getKitchenReportXlsx(params);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Kitchen_Report_${formatDate(new Date())}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }, [startDate, endDate, selectedKitchen]);

  return (
    <div className="space-y-6">
      {/* 1. Filters Bar */}
      <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 flex flex-col lg:flex-row items-end gap-6">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Select
             label={t('qi.kitchen')}
             options={[{ value: 'all', label: t('dash.filter.all_kitchens') }, ...kitchens.map(k => ({ value: String(k.id), label: k.name }))]}
             value={selectedKitchen}
             onChange={e => setSelectedKitchen(e.target.value)}
             icon={<Filter size={16} />}
          />
          <Input
             label={t('anl.date_from')}
             type="date"
             value={startDate}
             onChange={e => setStartDate(e.target.value)}
          />
           <Input
             label={t('anl.date_to')}
             type="date"
             value={endDate}
             onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
            <Button variant="secondary" onClick={handleExport} className="flex-1 lg:w-auto text-emerald-700 bg-emerald-50 border-emerald-200">
                <Download size={18} /> {t('anl.export')}
            </Button>
        </div>
      </div>

      {/* 2. Detailed Department Analytics Table */}
      <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-50 rounded-xl">
               <TrendingUp size={20} className="text-slate-400" />
             </div>
             <h3 className="font-display font-bold text-lg text-slate-800">{t('dash.main_table')}</h3>
           </div>
        </div>
        <div className="overflow-x-auto">
          {reportLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : (
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
                {showTransfers && (
                    <>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.trns_in')}</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display text-right">{t('anl.col.trns_out')}</th>
                    </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedTableStats.map(stat => (
                <tr key={stat.kitchenId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-xs text-slate-800">{stat.kitchenName}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{formatNumber(stat.beginningBalance)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{formatNumber(stat.incoming)}</td>
                  <td className="py-3 px-4 text-xs text-blue-600 text-right font-mono">{formatNumber(stat.actualExpense)}</td>
                  <td className="py-3 px-4 text-xs text-slate-800 font-bold text-right font-mono">{formatNumber(stat.endBalance)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-600 font-medium text-right font-mono">{formatNumber(stat.salesRevenue)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-600 font-medium text-right font-mono">{formatNumber(stat.markupVal)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{stat.markupPercent}%</td>
                  {showTransfers && (
                      <>
                        <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{formatNumber(stat.transfersIn)}</td>
                        <td className="py-3 px-4 text-xs text-slate-600 text-right font-mono">{formatNumber(stat.transfersOut)}</td>
                      </>
                  )}
                </tr>
              ))}
               <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                  <td className="py-3 px-4 text-xs text-slate-900">{t('anl.total')}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(tableTotals.beginningBalance)}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(tableTotals.incoming)}</td>
                  <td className="py-3 px-4 text-xs text-blue-700 text-right font-mono">{formatNumber(tableTotals.actualExpense)}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(tableTotals.endBalance)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-700 text-right font-mono">{formatNumber(tableTotals.salesRevenue)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-700 text-right font-mono">{formatNumber(tableTotals.markupVal)}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{tableTotals.markupPercent}%</td>
                  {showTransfers && (
                      <>
                        <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(tableTotals.transfersIn)}</td>
                        <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(tableTotals.transfersOut)}</td>
                      </>
                  )}
               </tr>
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="w-full">
        {/* Main Chart Section */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-slate-50 rounded-xl">
                 <CalendarIcon size={20} className="text-slate-400" />
               </div>
               <h3 className="font-display font-bold text-lg text-slate-900">{t('dash.sales_cost_dynamics')}</h3>
            </div>

            {/* Chart Mode Toggle */}
            <div className="flex bg-slate-50 p-1 rounded-xl overflow-x-auto max-w-full">
               <button
                 onClick={() => setChartMode('daily')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${chartMode === 'daily' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <BarChart3 size={14} />
                 {t('dash.chart.daily')}
               </button>
               <button
                 onClick={() => setChartMode('cumulative')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${chartMode === 'cumulative' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <LineChart size={14} />
                 {t('dash.chart.cumulative')}
               </button>
               <button
                 onClick={() => setChartMode('product')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${chartMode === 'product' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <PieChart size={14} />
                 {t('dash.chart.product')}
               </button>
            </div>
          </div>

          {/* Product Chart Filters */}
          {chartMode === 'product' && (
              <div className="flex flex-col sm:flex-row items-end gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-full sm:w-64">
                      <Select
                          label={t('qi.product')}
                          options={[{ value: '', label: t('qi.product_ph') }, ...products.map(p => ({ value: String(p.id), label: p.name }))]}
                          value={selectedProductId}
                          onChange={e => setSelectedProductId(e.target.value)}
                      />
                  </div>
                  <div className="w-full sm:w-48">
                      <Select
                          label={t('qi.kitchen')}
                          options={[{ value: 'all', label: t('dash.filter.all_kitchens') }, ...kitchens.map(k => ({ value: String(k.id), label: k.name }))]}
                          value={prodHistKitchen}
                          onChange={e => setProdHistKitchen(e.target.value)}
                      />
                  </div>
                  <div className="w-full sm:w-auto">
                      <Input
                          label={t('anl.date_from')}
                          type="date"
                          value={prodHistStart}
                          onChange={e => setProdHistStart(e.target.value)}
                      />
                  </div>
                  <div className="w-full sm:w-auto">
                      <Input
                          label={t('anl.date_to')}
                          type="date"
                          value={prodHistEnd}
                          onChange={e => setProdHistEnd(e.target.value)}
                      />
                  </div>
              </div>
          )}

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'daily' ? (
                <BarChart data={chartData.dailyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{fontFamily: 'Inter', fontSize: 11}}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{fontFamily: 'Inter', fontSize: 11}}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactNumber}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: 'white' }}
                    cursor={{fill: '#f8fafc'}}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar
                    dataKey="sales"
                    name={t('dash.chart.sales')}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="cost"
                    name={t('dash.chart.cost')}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              ) : chartMode === 'cumulative' ? (
                <AreaChart data={chartData.cumulativeChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{fontFamily: 'Inter', fontSize: 11}}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{fontFamily: 'Inter', fontSize: 11}}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactNumber}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: 'white' }}
                    cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCost)"
                    name={t('dash.chart.cum_cost')}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    name={t('dash.chart.cum_sales')}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData.productChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{fontFamily: 'Inter', fontSize: 11}}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{fontFamily: 'Inter', fontSize: 11}}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactNumber}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: 'white' }}
                    cursor={{fill: '#f8fafc'}}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar
                    dataKey="value"
                    name={t('dash.chart.prod_expense')}
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
