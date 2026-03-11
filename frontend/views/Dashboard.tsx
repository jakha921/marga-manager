
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, formatNumber, formatCompactNumber } from '../utils';
import { MoreHorizontal, Filter, Download, TrendingUp, Calendar as CalendarIcon, BarChart3, LineChart, PieChart } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Select from '../components/Select';
import Input from '../components/Input';
import Button from '../components/Button';
import DateFilter from '../components/DateFilter';

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
  // Default to current month if storage is empty
  const [selectedKitchen, setSelectedKitchen] = useState(() => localStorage.getItem('dash_kitchen') || 'all');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('dash_start') || currentStart);
  const [endDate, setEndDate] = useState(() => localStorage.getItem('dash_end') || currentEnd);
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative' | 'product'>('daily');

  // Product Chart specific filters
  const [prodHistStart, setProdHistStart] = useState(() => localStorage.getItem('dash_prod_start') || currentStart);
  const [prodHistEnd, setProdHistEnd] = useState(() => localStorage.getItem('dash_prod_end') || currentEnd);
  const [selectedProductId, setSelectedProductId] = useState(() => localStorage.getItem('dash_prod_id') || '');
  const [prodHistKitchen, setProdHistKitchen] = useState(() => localStorage.getItem('dash_prod_kitchen') || 'all');

  // Save filters to localStorage
  useEffect(() => localStorage.setItem('dash_kitchen', selectedKitchen), [selectedKitchen]);
  useEffect(() => localStorage.setItem('dash_start', startDate), [startDate]);
  useEffect(() => localStorage.setItem('dash_end', endDate), [endDate]);
  useEffect(() => localStorage.setItem('dash_prod_start', prodHistStart), [prodHistStart]);
  useEffect(() => localStorage.setItem('dash_prod_end', prodHistEnd), [prodHistEnd]);
  useEffect(() => localStorage.setItem('dash_prod_id', selectedProductId), [selectedProductId]);
  useEffect(() => localStorage.setItem('dash_prod_kitchen', prodHistKitchen), [prodHistKitchen]);

  // Combined Data Calculation
  const dashboardData = useMemo(() => {
    // ... (existing code for cardStats, displayedTableStats, tableTotals, dailyChartData, cumulativeChartData) ...

    // 1. Filter Operations for General Charts/Cards (using date range)
    const filteredOps = operations.filter(op => {
      const opDate = new Date(op.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const matchesDate = opDate >= start && opDate <= end;
      const matchesKitchen = selectedKitchen === 'all' || op.kitchenId === selectedKitchen;
      return matchesDate && matchesKitchen;
    });

    // 2. Calculate High-Level Stats (Cards)
    const cardStats = {
      totalOps: filteredOps.length,
      incomingVol: filteredOps.filter(op => op.type === 'INCOMING').reduce((acc, curr) => acc + curr.quantity, 0),
      salesCount: filteredOps.filter(op => op.type === 'SALE').reduce((acc, curr) => acc + curr.quantity, 0),
      salesRevenue: filteredOps.filter(op => op.type === 'SALE').reduce((acc, curr) => acc + (curr.price || 0), 0),
    };

    // 3. Calculate Detailed Kitchen/Dept Stats (Table)
    const kitchenStats = kitchens.map(k => {
      const startBalanceOps = operations.filter(op => 
        op.kitchenId === k.id && 
        op.type === 'DAILY' && 
        op.date === startDate
      );
      const beginningBalance = startBalanceOps.reduce((sum, op) => sum + (op.price || 0), 0);

      const incomingOps = operations.filter(op => {
        const opDate = new Date(op.date);
        const s = new Date(startDate);
        const e = new Date(endDate);
        return op.kitchenId === k.id && op.type === 'INCOMING' && opDate >= s && opDate <= e;
      });
      const incoming = incomingOps.reduce((sum, op) => sum + (op.price || 0), 0);

      const endBalanceOps = operations.filter(op => 
        op.kitchenId === k.id && 
        op.type === 'DAILY' && 
        op.date === endDate
      );
      const endBalance = endBalanceOps.reduce((sum, op) => sum + (op.price || 0), 0);

      // Transfers Logic
      const transferOutOps = operations.filter(op => {
        const opDate = new Date(op.date);
        const s = new Date(startDate);
        const e = new Date(endDate);
        return op.kitchenId === k.id && op.type === 'TRANSFER' && opDate >= s && opDate <= e;
      });
      const transfersOut = transferOutOps.reduce((sum, op) => sum + (op.price || 0), 0);

      const transferInOps = operations.filter(op => {
        const opDate = new Date(op.date);
        const s = new Date(startDate);
        const e = new Date(endDate);
        return op.toKitchenId === k.id && op.type === 'TRANSFER' && opDate >= s && opDate <= e;
      });
      const transfersIn = transferInOps.reduce((sum, op) => sum + (op.price || 0), 0);

      // Actual Expense (Consumption) calculation:
      const actualExpense = beginningBalance + incoming + transfersIn - transfersOut - endBalance;

      const salesOps = operations.filter(op => {
        const opDate = new Date(op.date);
        const s = new Date(startDate);
        const e = new Date(endDate);
        return op.kitchenId === k.id && op.type === 'SALE' && opDate >= s && opDate <= e;
      });
      const salesRevenue = salesOps.reduce((sum, op) => sum + (op.price || 0), 0);

      const markupVal = salesRevenue - actualExpense;
      const markupPercent = actualExpense > 0 ? ((markupVal / actualExpense) * 100).toFixed(1) : '0.0';

      return { 
        id: k.id, 
        name: k.name, 
        beginningBalance, 
        incoming, 
        salesRevenue, 
        actualExpense, 
        endBalance, 
        markupVal, 
        markupPercent, 
        transfersIn,
        transfersOut
      };
    });

    const displayedTableStats = selectedKitchen === 'all' ? kitchenStats : kitchenStats.filter(k => k.id === selectedKitchen);

    // 4. Calculate Table Totals
    const totals = displayedTableStats.reduce((acc, curr) => ({
        beginningBalance: acc.beginningBalance + curr.beginningBalance,
        incoming: acc.incoming + curr.incoming,
        actualExpense: acc.actualExpense + curr.actualExpense,
        endBalance: acc.endBalance + curr.endBalance,
        salesRevenue: acc.salesRevenue + curr.salesRevenue,
        markupVal: acc.markupVal + curr.markupVal,
        transfersIn: acc.transfersIn + curr.transfersIn,
        transfersOut: acc.transfersOut + curr.transfersOut
    }), { beginningBalance: 0, incoming: 0, actualExpense: 0, endBalance: 0, salesRevenue: 0, markupVal: 0, transfersIn: 0, transfersOut: 0 });

    const tableTotals = {
      ...totals,
      markupPercent: totals.actualExpense > 0 ? ((totals.markupVal / totals.actualExpense) * 100).toFixed(1) : '0.0'
    };

    // 5. Calculate Chart Data (Daily Sales vs Cost)
    const chartMap = new Map<string, { sales: number; cost: number }>();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        chartMap.set(d.toISOString().split('T')[0], { sales: 0, cost: 0 });
    }
    
    filteredOps.filter(op => op.type === 'SALE').forEach(op => {
       const curr = chartMap.get(op.date) || { sales: 0, cost: 0 };
       chartMap.set(op.date, { ...curr, sales: curr.sales + (op.price || 0) });
    });

    filteredOps.filter(op => op.type === 'INCOMING').forEach(op => {
        const curr = chartMap.get(op.date) || { sales: 0, cost: 0 };
        chartMap.set(op.date, { ...curr, cost: curr.cost + (op.price || 0) });
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
        return {
            date: item.date,
            sales: runningSales,
            cost: runningCost
        };
    });

    // 6. Calculate Product Expense Chart Data (Consumption in Units)
    const productChartData: { date: string; value: number }[] = [];
    
    if (selectedProductId) {
        const pStart = new Date(prodHistStart);
        const pEnd = new Date(prodHistEnd);
        
        // Helper to get balance for a specific date
        const getBalance = (dateStr: string) => {
            const ops = operations.filter(op => 
                op.productId === selectedProductId && 
                op.type === 'DAILY' && 
                op.date === dateStr &&
                (prodHistKitchen === 'all' || op.kitchenId === prodHistKitchen)
            );
            // If 'all', sum up balances of all kitchens. If specific, take that kitchen's balance.
            // Note: If multiple entries for same kitchen/date, we should ideally take the latest. 
            // Assuming one daily entry per kitchen per day for simplicity or summing them if multiple (which implies corrections).
            return ops.reduce((acc, curr) => acc + curr.quantity, 0);
        };

        const getIncoming = (dateStr: string) => {
            return operations
                .filter(op => 
                    op.productId === selectedProductId && 
                    op.type === 'INCOMING' && 
                    op.date === dateStr &&
                    (prodHistKitchen === 'all' || op.kitchenId === prodHistKitchen)
                )
                .reduce((acc, curr) => acc + curr.quantity, 0);
        };

        const getTransferOut = (dateStr: string) => {
            if (prodHistKitchen === 'all') return 0; // Transfers don't affect global consumption
            return operations
                .filter(op => 
                    op.productId === selectedProductId && 
                    op.type === 'TRANSFER' && 
                    op.date === dateStr &&
                    op.kitchenId === prodHistKitchen
                )
                .reduce((acc, curr) => acc + curr.quantity, 0);
        };

        const getTransferIn = (dateStr: string) => {
            if (prodHistKitchen === 'all') return 0; // Transfers don't affect global consumption
            return operations
                .filter(op => 
                    op.productId === selectedProductId && 
                    op.type === 'TRANSFER' && 
                    op.date === dateStr &&
                    op.toKitchenId === prodHistKitchen
                )
                .reduce((acc, curr) => acc + curr.quantity, 0);
        };

        for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            // Previous day date string
            const prevD = new Date(d);
            prevD.setDate(prevD.getDate() - 1);
            const prevDateStr = prevD.toISOString().split('T')[0];

            const prevBalance = getBalance(prevDateStr);
            const currBalance = getBalance(dateStr);
            const incoming = getIncoming(dateStr);
            const transferOut = getTransferOut(dateStr);
            const transferIn = getTransferIn(dateStr);

            // Formula: Prev + In - Curr + Out - In_Transfer
            // Note: If balances are missing (0), the result might be negative or inaccurate.
            // We display it as is.
            let consumption = prevBalance + incoming - currBalance;
            
            if (prodHistKitchen !== 'all') {
                consumption = consumption + transferOut - transferIn;
            }

            productChartData.push({
                date: formatDate(dateStr),
                value: consumption
            });
        }
    }

    return { cardStats, displayedTableStats, tableTotals, dailyChartData, cumulativeChartData, productChartData };
  }, [operations, kitchens, selectedKitchen, startDate, endDate, prodHistStart, prodHistEnd, selectedProductId, prodHistKitchen]);

  const showTransfers = kitchens.length > 1;

  // Styled Excel Export for Dashboard
  const handleExport = () => {
     const kitchenName = selectedKitchen === 'all' 
        ? 'Barcha oshxonalar' 
        : kitchens.find(k => k.id === selectedKitchen)?.name || 'Noma\'lum';
     
     const reportTitle = "Asosiy Moliyaviy Hisobot"; // Main Financial Report

     let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
            .header { font-size: 16px; font-weight: bold; text-align: center; height: 40px; }
            .subheader { font-weight: bold; }
            .table-head { background-color: #f0f0f0; font-weight: bold; text-align: center; border: 1px solid #000; }
            .cell { border: 1px solid #000; padding: 5px; }
            .num { mso-number-format:"\#\,\#\#0"; }
        </style>
      </head>
      <body>
        <table border="1">
           <tr>
              <td colspan="8" class="header" style="font-size: 18px; text-align: center; background-color: #e2e8f0;">${reportTitle}</td>
           </tr>
           <tr>
              <td colspan="3" class="subheader"><b>Oshxona:</b> ${kitchenName}</td>
              <td colspan="5" class="subheader"><b>Davr:</b> ${startDate} - ${endDate}</td>
           </tr>
           <tr><td colspan="8"></td></tr>
           <tr style="background-color: #cbd5e1;">
              <th class="table-head">Bo'lim (Oshxona)</th>
              <th class="table-head">Bosh. Qoldiq</th>
              <th class="table-head">Kirim</th>
              <th class="table-head">Xarajat (Sarflangan)</th>
              <th class="table-head">Oxir. Qoldiq</th>
              <th class="table-head">Sotuv (Tushum)</th>
              <th class="table-head">Foyda (Marja)</th>
              <th class="table-head">%</th>
           </tr>
    `;

    dashboardData.displayedTableStats.forEach(stat => {
        tableHTML += `
         <tr>
            <td class="cell"><b>${stat.name}</b></td>
            <td class="cell num" style="text-align: right;">${stat.beginningBalance}</td>
            <td class="cell num" style="text-align: right;">${stat.incoming}</td>
            <td class="cell num" style="text-align: right;">${stat.actualExpense}</td>
            <td class="cell num" style="text-align: right;"><b>${stat.endBalance}</b></td>
            <td class="cell num" style="text-align: right; color: blue;">${stat.salesRevenue}</td>
            <td class="cell num" style="text-align: right; color: green;">${stat.markupVal}</td>
            <td class="cell num" style="text-align: right;">${stat.markupPercent}%</td>
         </tr>
       `;
    });

    // Total Row
    tableHTML += `
       <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td class="cell"><b>JAMI (ITOGO)</b></td>
          <td class="cell num" style="text-align: right;">${dashboardData.tableTotals.beginningBalance}</td>
          <td class="cell num" style="text-align: right;">${dashboardData.tableTotals.incoming}</td>
          <td class="cell num" style="text-align: right;">${dashboardData.tableTotals.actualExpense}</td>
          <td class="cell num" style="text-align: right;">${dashboardData.tableTotals.endBalance}</td>
          <td class="cell num" style="text-align: right;">${dashboardData.tableTotals.salesRevenue}</td>
          <td class="cell num" style="text-align: right;">${dashboardData.tableTotals.markupVal}</td>
          <td class="cell">-</td>
       </tr>
    </table>
    </body>
    </html>
    `;

     const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `Main_Report_${formatDate(new Date())}.xls`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Filters Bar */}
      <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 flex flex-col lg:flex-row items-end gap-6">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Select 
             label={t('qi.kitchen')}
             options={[{ value: 'all', label: t('dash.filter.all_kitchens') }, ...kitchens.map(k => ({ value: k.id, label: k.name }))]}
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
              {dashboardData.displayedTableStats.map(stat => (
                <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-xs text-slate-800">{stat.name}</td>
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
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(dashboardData.tableTotals.beginningBalance)}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(dashboardData.tableTotals.incoming)}</td>
                  <td className="py-3 px-4 text-xs text-blue-700 text-right font-mono">{formatNumber(dashboardData.tableTotals.actualExpense)}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(dashboardData.tableTotals.endBalance)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-700 text-right font-mono">{formatNumber(dashboardData.tableTotals.salesRevenue)}</td>
                  <td className="py-3 px-4 text-xs text-emerald-700 text-right font-mono">{formatNumber(dashboardData.tableTotals.markupVal)}</td>
                  <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{dashboardData.tableTotals.markupPercent}%</td>
                  {showTransfers && (
                      <>
                        <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(dashboardData.tableTotals.transfersIn)}</td>
                        <td className="py-3 px-4 text-xs text-slate-900 text-right font-mono">{formatNumber(dashboardData.tableTotals.transfersOut)}</td>
                      </>
                  )}
               </tr>
            </tbody>
          </table>
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
                          options={[{ value: '', label: t('qi.product_ph') }, ...products.map(p => ({ value: p.id, label: p.name }))]}
                          value={selectedProductId}
                          onChange={e => setSelectedProductId(e.target.value)}
                      />
                  </div>
                  <div className="w-full sm:w-48">
                      <Select
                          label={t('qi.kitchen')}
                          options={[{ value: 'all', label: t('dash.filter.all_kitchens') }, ...kitchens.map(k => ({ value: k.id, label: k.name }))]}
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
                <BarChart data={dashboardData.dailyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                  {/* Sales Bar (Green) */}
                  <Bar 
                    dataKey="sales" 
                    name={t('dash.chart.sales')} 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  {/* Cost Bar (Blue) */}
                  <Bar 
                    dataKey="cost" 
                    name={t('dash.chart.cost')} 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              ) : chartMode === 'cumulative' ? (
                <AreaChart data={dashboardData.cumulativeChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                  {/* Cost Line (Blue) */}
                  <Area 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorCost)" 
                    name={t('dash.chart.cum_cost')}
                  />
                  {/* Sales Line (Green) */}
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
                <BarChart data={dashboardData.productChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
