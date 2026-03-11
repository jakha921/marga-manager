
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { FileText, Download, Filter, Search, TrendingUp, DollarSign } from 'lucide-react';
import Select from '../components/Select';
import Input from '../components/Input';
import Button from '../components/Button';

const Reports: React.FC = () => {
  const { t } = useLanguage();
  const { products, operations, kitchens, currentOrganization } = useData();
  
  // Helper to get current month range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  };

  const { start: currentStart, end: currentEnd } = getCurrentMonthRange();

  // Filters with Persistence
  const [selectedKitchen, setSelectedKitchen] = useState(() => localStorage.getItem('rep_kitchen') || 'all');
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('rep_search') || '');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('rep_start') || currentStart);
  const [endDate, setEndDate] = useState(() => localStorage.getItem('rep_end') || currentEnd);

  // Save filters to localStorage
  useEffect(() => localStorage.setItem('rep_kitchen', selectedKitchen), [selectedKitchen]);
  useEffect(() => localStorage.setItem('rep_search', searchTerm), [searchTerm]);
  useEffect(() => localStorage.setItem('rep_start', startDate), [startDate]);
  useEffect(() => localStorage.setItem('rep_end', endDate), [endDate]);

  const currencySymbol = currentOrganization?.currency || 'UZS';

  // Inventory Balance Calculation
  const inventoryReport = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.includes(searchTerm)
    ).map(product => {
      // Filter ops for this product and selected kitchen(s) AND Date Range
      const prodOps = operations.filter(op => {
        const matchesKitchen = selectedKitchen === 'all' || String(op.kitchenId) === selectedKitchen;

        // Date Check
        const opDate = new Date(op.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        const matchesDate = opDate >= start && opDate <= end;

        return String(op.productId) === String(product.id) && matchesKitchen && matchesDate;
      });

      // Calculate totals (Quantity AND Value)
      
      // Incoming
      const incomingOps = prodOps.filter(op => op.type === 'INCOMING');
      const incomingQty = incomingOps.reduce((acc, op) => acc + op.quantity, 0);
      const incomingVal = incomingOps.reduce((acc, op) => acc + (op.price || 0), 0);

      // Sales
      const salesOps = prodOps.filter(op => op.type === 'SALE');
      const salesQty = salesOps.reduce((acc, op) => acc + op.quantity, 0);
      const salesVal = salesOps.reduce((acc, op) => acc + (op.price || 0), 0);
      
      // Transfers Out
      const transferOutOps = prodOps.filter(op => op.type === 'TRANSFER' && (selectedKitchen === 'all' || String(op.kitchenId) === selectedKitchen));
      const transferOutQty = transferOutOps.reduce((acc, op) => acc + op.quantity, 0);
      
      // Transfers In
      // For Transfers In, we need to check the 'toKitchenId' and also the date
      const transferInOps = operations.filter(op => {
         const opDate = new Date(op.date);
         const start = new Date(startDate);
         const end = new Date(endDate);
         const matchesDate = opDate >= start && opDate <= end;
         
         return String(op.productId) === String(product.id) &&
                op.type === 'TRANSFER' &&
                (selectedKitchen === 'all' || String(op.toKitchenId) === selectedKitchen) &&
                matchesDate;
      });
      const transferInQty = transferInOps.reduce((acc, op) => acc + op.quantity, 0);

      // Balance (Net Flow in Period)
      // Logic: Balance = Incoming + TransferIn - Sales - TransferOut
      const balanceQty = incomingQty + transferInQty - salesQty - transferOutQty;
      
      // Estimated Balance Value (Using Average Incoming Price or fallback)
      const avgPrice = incomingQty > 0 ? (incomingVal / incomingQty) : 0;
      const balanceVal = balanceQty * avgPrice;

      return {
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        category: product.category,
        incoming: { qty: incomingQty, val: incomingVal },
        sales: { qty: salesQty, val: salesVal },
        transfers: { qty: transferInQty - transferOutQty },
        balance: { qty: balanceQty, val: balanceVal }
      };
    });
  }, [products, operations, selectedKitchen, searchTerm, startDate, endDate]);

  const formatMoney = (amount: number) => {
    // Format with spaces for thousands (common in CIS)
    return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 flex flex-col lg:flex-row items-end gap-6">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-6">
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
          <div className="relative">
             <label className="block font-display font-bold text-[11px] text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                {t('qi.search_ph')}
             </label>
             <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  className="w-full bg-white border border-slate-200 text-slate-800 font-body text-[13px] font-medium placeholder-slate-400 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:border-slate-400 h-[46px]"
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </div>
        <div className="w-full lg:w-auto">
            <Button variant="secondary" className="w-full lg:w-auto text-emerald-700 bg-emerald-50 border-emerald-200 h-[46px]">
                <Download size={18} /> {t('anl.export')}
            </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-50 rounded-xl">
               <FileText size={20} className="text-slate-400" />
             </div>
             <div>
                <h3 className="font-display font-bold text-lg text-slate-800">{t('rep.title')}</h3>
                <p className="text-xs text-slate-400 font-medium">Real-time stock levels and valuation</p>
             </div>
           </div>
           
           <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <DollarSign size={14} className="text-slate-400" />
              Values in <span className="font-bold text-slate-700">{currencySymbol}</span>
           </div>
        </div>
        
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display w-20">{t('rep.col.code')}</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">{t('rep.col.product')}</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display text-right bg-blue-50/30 border-l border-r border-slate-100/50">{t('rep.col.incoming')}</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display text-right bg-emerald-50/30 border-r border-slate-100/50">{t('rep.col.sales')}</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display text-right">{t('rep.col.transfer')}</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display text-right">{t('rep.col.balance')}</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {inventoryReport.map(item => (
                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                       {/* Code */}
                       <td className="py-5 px-6 font-mono text-xs font-bold text-slate-400 align-top pt-6">{item.code}</td>
                       
                       {/* Product Name */}
                       <td className="py-5 px-6 align-top pt-5">
                          <div className="flex flex-col">
                             <span className="font-bold text-sm text-slate-800 mb-0.5">{item.name}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 rounded-md w-fit">
                               {item.category}
                             </span>
                          </div>
                       </td>

                       {/* Incoming (Blue Theme) */}
                       <td className="py-5 px-6 text-right bg-blue-50/10 group-hover:bg-blue-50/30 border-l border-r border-slate-100 transition-colors">
                          <div className="flex flex-col items-end gap-2">
                             <div className="bg-white/60 px-2 py-1 rounded-md border border-blue-100/50 shadow-sm w-full">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block text-left mb-0.5">{t('rep.qty')}</span>
                                <span className="font-mono font-bold text-sm text-blue-700 block text-right">
                                   {item.incoming.qty > 0 ? '+' : ''}{item.incoming.qty.toLocaleString()} <span className="text-[10px] text-blue-400/80">{item.unit}</span>
                                </span>
                             </div>
                             
                             {item.incoming.val > 0 && (
                               <div className="w-full">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase block text-left mb-0.5">{t('rep.sum')}</span>
                                  <span className="text-xs font-bold text-slate-600 block text-right">
                                    {formatMoney(item.incoming.val)} {currencySymbol}
                                  </span>
                               </div>
                             )}
                          </div>
                       </td>

                       {/* Sales (Emerald Theme) */}
                       <td className="py-5 px-6 text-right bg-emerald-50/10 group-hover:bg-emerald-50/30 border-r border-slate-100 transition-colors">
                          <div className="flex flex-col items-end gap-2">
                             <div className="bg-white/60 px-2 py-1 rounded-md border border-emerald-100/50 shadow-sm w-full">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block text-left mb-0.5">{t('rep.qty')}</span>
                                <span className="font-mono font-bold text-sm text-emerald-700 block text-right">
                                  {item.sales.qty > 0 ? '-' : ''}{item.sales.qty.toLocaleString()} <span className="text-[10px] text-emerald-400/80">{item.unit}</span>
                                </span>
                             </div>
                             {item.sales.val > 0 && (
                               <div className="w-full">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase block text-left mb-0.5">{t('rep.sum')}</span>
                                 <span className="text-xs font-bold text-slate-600 block text-right">
                                   {formatMoney(item.sales.val)} {currencySymbol}
                                 </span>
                               </div>
                             )}
                          </div>
                       </td>

                       {/* Transfer */}
                       <td className="py-5 px-6 text-right align-top pt-6">
                          <span className={`font-mono text-xs font-medium ${item.transfers !== 0 ? 'text-purple-600' : 'text-slate-300'}`}>
                             {item.transfers > 0 ? '+' : ''}{item.transfers !== 0 ? item.transfers.toLocaleString() : '-'}
                          </span>
                       </td>

                       {/* Balance (Visual Pill) */}
                       <td className="py-5 px-6 text-right align-top pt-5">
                          <div className="flex flex-col items-end gap-2">
                             <div className={`px-3 py-1.5 rounded-xl border flex items-center justify-between min-w-[100px] shadow-sm ${
                                item.balance.qty < 0 ? 'bg-red-50 border-red-100 text-red-700' : 
                                item.balance.qty === 0 ? 'bg-slate-50 border-slate-100 text-slate-400' : 
                                'bg-white border-slate-200 text-slate-900'
                             }`}>
                                <span className="text-[10px] font-bold uppercase opacity-50 mr-2">{t('rep.qty')}</span>
                                <span className="font-bold text-sm">
                                   {item.balance.qty.toLocaleString()} <span className="text-xs font-normal opacity-60 ml-0.5">{item.unit}</span>
                                </span>
                             </div>
                             
                             {item.balance.val !== 0 && (
                                <div className="text-right">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{t('rep.sum')}</div>
                                   <span className="text-xs font-bold text-slate-700 flex items-center justify-end gap-1">
                                      {formatMoney(item.balance.val)} {currencySymbol}
                                   </span>
                                </div>
                             )}
                          </div>
                       </td>
                    </tr>
                 ))}
                 
                 {inventoryReport.length === 0 && (
                    <tr>
                       <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                             <Search size={32} className="mb-3 opacity-20" />
                             <span className="text-sm font-medium">{t('rep.no_data')}</span>
                          </div>
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
