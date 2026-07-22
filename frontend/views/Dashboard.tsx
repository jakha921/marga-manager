
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

import { formatDate, formatNumber, formatCompactNumber } from '../utils';
import { Filter, Download, TrendingUp, Calendar as CalendarIcon, BarChart3, LineChart, PieChart, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Select from '../components/Select';
import Input from '../components/Input';
import Button from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { analyticsService } from '../api/services/analytics';
import { KitchenReportResponse } from '../types';

const ChartTooltip = React.memo(({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) => {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  const salesEntry = payload.find(p => p.dataKey === 'sales');
  const costEntry = payload.find(p => p.dataKey === 'cost');
  const margin = (salesEntry?.value ?? 0) - (costEntry?.value ?? 0);
  const tooltipBg = '#18181b';
  const tooltipBorder = '#333';
  return (
    <div style={{ backgroundColor: tooltipBg, borderRadius: '8px', color: 'white', fontSize: '12px', padding: '8px 12px' }}>
      <p style={{ marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {salesEntry && <p style={{ color: '#10b981' }}>{salesEntry.name}: {formatNumber(salesEntry.value)}</p>}
      {costEntry && <p style={{ color: '#3b82f6' }}>{costEntry.name}: {formatNumber(costEntry.value)}</p>}
      <p style={{ color: '#f59e0b', borderTop: `1px solid ${tooltipBorder}`, marginTop: 4, paddingTop: 4 }}>
        {t('dash.chart.margin')}: {formatNumber(margin)}
      </p>
    </div>
  );
});

const Dashboard: React.FC = () => {
  const { stats, operations, kitchens, products, subscription } = useData();
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
  const [showProUpsell, setShowProUpsell] = useState(false);

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

  const isBasicPlan = subscription === 'BASIC';
  // Порог истории Basic: сервер всё равно клемпит, тут только предупреждение
  const basicCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const historyClamped = isBasicPlan && startDate < basicCutoff;
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

    // Расход продукта. Остатки фиксируются не каждый день, поэтому расход
    // считается интервалами между записями остатков и приписывается дню записи:
    // расход = прошлый остаток + приходы интервала + трансферы_к_нам
    //          − трансферы_от_нас − текущий остаток
    // (та же формула, что в серверном kitchen-report).
    const productChartData: { date: string; value: number }[] = [];

    if (selectedProductId) {
        const pStart = new Date(prodHistStart);
        const pEnd = new Date(prodHistEnd);

        const prodOps = operations.filter(op => String(op.productId) === selectedProductId);
        const inKitchen = (op: typeof prodOps[number], field: 'kitchenId' | 'toKitchenId' = 'kitchenId') =>
            prodHistKitchen === 'all' || String(op[field]) === prodHistKitchen;

        const balanceByDate = new Map<string, number>();
        prodOps
            .filter(op => op.type === 'DAILY' && inKitchen(op))
            .forEach(op => balanceByDate.set(op.date, (balanceByDate.get(op.date) || 0) + (Number(op.quantity) || 0)));
        const balanceDates = [...balanceByDate.keys()].sort();

        const sumInterval = (
            type: string,
            afterExclusive: string,
            toInclusive: string,
            field: 'kitchenId' | 'toKitchenId' = 'kitchenId'
        ) =>
            prodOps
                .filter(op => op.type === type && op.date > afterExclusive && op.date <= toInclusive && inKitchen(op, field))
                .reduce((acc, op) => acc + (Number(op.quantity) || 0), 0);

        for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            let consumption = 0;

            if (balanceByDate.has(dateStr)) {
                // Последняя запись остатка ДО этого дня — база интервала
                const prevDate = [...balanceDates].reverse().find(bd => bd < dateStr);
                if (prevDate) {
                    const incoming = sumInterval('INCOMING', prevDate, dateStr);
                    consumption =
                        (balanceByDate.get(prevDate) || 0) + incoming - (balanceByDate.get(dateStr) || 0);
                    if (prodHistKitchen !== 'all') {
                        const transferOut = sumInterval('TRANSFER', prevDate, dateStr, 'kitchenId');
                        const transferIn = sumInterval('TRANSFER', prevDate, dateStr, 'toKitchenId');
                        consumption = consumption + transferIn - transferOut;
                    }
                }
                // Первая запись остатка: базы нет, расход неизвестен — оставляем 0
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
      <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-card border border-[var(--border-light)] flex flex-col lg:flex-row items-end gap-6">
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

      {/* Basic: история ограничена 30 днями (сервер клемпит, тут предупреждение) */}
      {historyClamped && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <Lock size={16} className="shrink-0" />
          <span className="flex-1">{t('plan.history_limit')}</span>
          <Link to="/settings" className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">
            {t('plan.upgrade_cta')}
          </Link>
        </div>
      )}

      {/* 2. Detailed Department Analytics Table */}
      <div className="bg-[var(--bg-surface)] rounded-3xl shadow-card border border-[var(--border-light)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-[var(--bg-surface-2)] rounded-xl">
               <TrendingUp size={20} className="text-[var(--text-muted)]" />
             </div>
             <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">{t('dash.main_table')}</h3>
           </div>
        </div>
        <div className="overflow-x-auto">
          {reportLoading ? (
            <Skeleton rows={5} />
          ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border-light)]">
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display cursor-help sticky left-0 z-10 bg-[var(--bg-surface-2)]" title={t('anl.col.dept.full')}>{t('anl.col.dept')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.start.full')}>{t('anl.col.start')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.in.full')}>{t('anl.col.in')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.exp.full')}>{t('anl.col.exp')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.end.full')}>{t('anl.col.end')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.sales.full')}>{t('anl.col.sales')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.mrk.full')}>{t('anl.col.mrk')}</th>
                <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right">%</th>
                {showTransfers && (
                    <>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.trns_in.full')}>{t('anl.col.trns_in')}</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-display text-right cursor-help" title={t('anl.col.trns_out.full')}>{t('anl.col.trns_out')}</th>
                    </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedTableStats.map(stat => (
                <tr key={stat.kitchenId} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                  <td className="py-3 px-4 font-bold text-xs text-[var(--text-primary)] sticky left-0 z-10 bg-[var(--bg-surface)]">{stat.kitchenName}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-secondary)] text-right font-mono whitespace-nowrap">{formatNumber(stat.beginningBalance)}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-secondary)] text-right font-mono whitespace-nowrap">{formatNumber(stat.incoming)}</td>
                  <td className="py-3 px-4 text-xs text-blue-600 text-right font-mono whitespace-nowrap">{formatNumber(stat.actualExpense)}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-primary)] font-bold text-right font-mono whitespace-nowrap">{formatNumber(stat.endBalance)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-600 font-medium text-right font-mono whitespace-nowrap">{formatNumber(stat.salesRevenue)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-600 font-medium text-right font-mono whitespace-nowrap">{formatNumber(stat.markupVal)}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-secondary)] text-right font-mono whitespace-nowrap">{stat.markupPercent}%</td>
                  {showTransfers && (
                      <>
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)] text-right font-mono whitespace-nowrap">{formatNumber(stat.transfersIn)}</td>
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)] text-right font-mono whitespace-nowrap">{formatNumber(stat.transfersOut)}</td>
                      </>
                  )}
                </tr>
              ))}
               <tr className="bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] font-bold">
                  <td className="py-3 px-4 text-xs text-[var(--text-primary)] sticky left-0 z-10 bg-[var(--bg-surface-2)]">{t('anl.total')}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-primary)] text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.beginningBalance)}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-primary)] text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.incoming)}</td>
                  <td className="py-3 px-4 text-xs text-blue-700 text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.actualExpense)}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-primary)] text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.endBalance)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-700 text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.salesRevenue)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-700 text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.markupVal)}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-primary)] text-right font-mono whitespace-nowrap">{tableTotals.markupPercent}%</td>
                  {showTransfers && (
                      <>
                        <td className="py-3 px-4 text-xs text-[var(--text-primary)] text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.transfersIn)}</td>
                        <td className="py-3 px-4 text-xs text-[var(--text-primary)] text-right font-mono whitespace-nowrap">{formatNumber(tableTotals.transfersOut)}</td>
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
        <div className="bg-[var(--bg-surface)] rounded-3xl p-6 shadow-card border border-[var(--border-light)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-[var(--bg-surface-2)] rounded-xl">
                 <CalendarIcon size={20} className="text-[var(--text-muted)]" />
               </div>
               <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">{t('dash.sales_cost_dynamics')}</h3>
            </div>

            {/* Chart Mode Toggle */}
            <div className="flex bg-[var(--bg-surface-2)] p-1 rounded-xl overflow-x-auto max-w-full">
               <button
                 onClick={() => setChartMode('daily')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${chartMode === 'daily' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-slate-700'}`}
               >
                 <BarChart3 size={14} />
                 {t('dash.chart.daily')}
               </button>
               <button
                 onClick={() => setChartMode('cumulative')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${chartMode === 'cumulative' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-slate-700'}`}
               >
                 <LineChart size={14} />
                 {t('dash.chart.cumulative')}
               </button>
               <button
                 onClick={() => isBasicPlan ? setShowProUpsell(true) : setChartMode('product')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${chartMode === 'product' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-slate-700'}`}
               >
                 {isBasicPlan ? <Lock size={14} /> : <PieChart size={14} />}
                 {t('dash.chart.product')}
               </button>
            </div>
          </div>

          {/* Product Chart Filters */}
          {chartMode === 'product' && (
              <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-end gap-4 bg-[var(--bg-surface-2)] p-4 rounded-2xl border border-[var(--border-light)]">
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
              <p className="mt-2 px-1 text-xs text-[var(--text-muted)]">{t('dash.chart.prod_hint')}</p>
              </div>
          )}

          {!chartData.dailyChartData.some(d => d.sales > 0 || d.cost > 0) ? (
            <div className="flex h-[300px] w-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">{t('dash.no_data')}</p>
              <p className="text-xs text-[var(--text-muted)]">{t('dash.no_data.hint')}</p>
            </div>
          ) : (
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
                  <Tooltip content={<ChartTooltip />} cursor={{fill: '#f8fafc'}} />
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
                  <Tooltip content={<ChartTooltip />} cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}} />
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
          )}
        </div>
      </div>

      {/* Апселл: «По продуктам» доступен в Pro */}
      {showProUpsell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProUpsell(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-surface)] p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Lock size={22} />
            </div>
            <h3 className="font-display text-lg font-bold">{t('plan.pro_feature.title')}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{t('plan.pro_feature.product_chart')}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowProUpsell(false)}
                className="flex-1 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"
              >
                {t('plan.upsell.later')}
              </button>
              <Link
                to="/settings"
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t('plan.upgrade_cta')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
