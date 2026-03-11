
import React, { useState, useRef, useEffect } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import DateFilter from '../components/DateFilter';
import { OPERATION_TYPES } from '../constants';
import { OperationType, OperationEntry } from '../types';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatNumber, parseNumber } from '../utils';
import { Clock, CheckCircle2, Zap, Search, Filter, ScanLine, Edit2, Trash2, Calendar, MapPin, DollarSign, Package, Sigma, ChevronDown, Download } from 'lucide-react';

const QuickInput: React.FC = () => {
  const { products, kitchens, operations, addOperation, updateOperation, deleteOperation } = useData();
  const { t } = useLanguage();
  const { userRole } = useAuth();
  
  // Input State
  const [opType, setOpType] = useState<OperationType>('DAILY'); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKitchen, setSelectedKitchen] = useState(kitchens[0]?.id || '');
  const [targetKitchen, setTargetKitchen] = useState(kitchens[1]?.id || ''); 
  const [productSearch, setProductSearch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState(''); // Stores formatted string
  const [totalSum, setTotalSum] = useState(''); // Stores formatted string
  
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<OperationEntry | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<OperationEntry>>({});
  const [editUnitPrice, setEditUnitPrice] = useState<string>('');
  
  // Formatted strings for Edit Modal
  const [editQtyStr, setEditQtyStr] = useState('');
  const [editUnitPriceStr, setEditUnitPriceStr] = useState('');
  const [editTotalPriceStr, setEditTotalPriceStr] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper for dates
  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // Get date 30 days in future for demo purposes
  const getFutureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  // History Filter State with Persistence
  const [histSearch, setHistSearch] = useState('');
  const [histKitchen, setHistKitchen] = useState(() => localStorage.getItem('qi_hist_kitchen') || 'all');
  const [histType, setHistType] = useState<string>(opType);
  const [histDateFrom, setHistDateFrom] = useState(() => localStorage.getItem('qi_hist_from') || getYesterday());
  const [histDateTo, setHistDateTo] = useState(() => localStorage.getItem('qi_hist_to') || getFutureDate());

  // Save persisted filters
  useEffect(() => localStorage.setItem('qi_hist_kitchen', histKitchen), [histKitchen]);
  useEffect(() => localStorage.setItem('qi_hist_from', histDateFrom), [histDateFrom]);
  useEffect(() => localStorage.setItem('qi_hist_to', histDateTo), [histDateTo]);

  // Refs for keyboard navigation
  const kitchenRef = useRef<HTMLSelectElement>(null);
  const targetKitchenRef = useRef<HTMLSelectElement>(null);
  const productRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const revenueRef = useRef<HTMLInputElement>(null);
  const totalSumRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(p => 
    p.name.toLowerCase() === productSearch.toLowerCase() || 
    p.code === productSearch
  );

  const isProductError = opType !== 'SALE' && productSearch.trim().length > 0 && !selectedProduct;

  // Determine if we show kitchen filters
  const showKitchenFilter = kitchens.length > 1;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setProductSearch('');
    setQuantity('');
    setUnitPrice('');
    setTotalSum('');
    setHistType(opType); 
    setCurrentPage(1);

    setTimeout(() => {
        if (opType === 'SALE') revenueRef.current?.focus();
        else if (opType === 'TRANSFER') {
            if (!targetKitchen) targetKitchenRef.current?.focus();
            else productRef.current?.focus();
        } else productRef.current?.focus();
    }, 100);
  }, [opType]);

  // --- REQUIREMENT 1: Auto-fill Price from last INCOMING ---
  useEffect(() => {
    if (selectedProduct && opType !== 'SALE') {
        // Find the latest INCOMING operation for this product
        // We sort operations by date descending to get the newest one
        const lastIncoming = operations
            .filter(op => op.productId === selectedProduct.id && op.type === 'INCOMING')
            .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime())[0];

        let newPrice = '';
        if (lastIncoming && lastIncoming.price && lastIncoming.quantity) {
            const calculatedUnit = lastIncoming.price / lastIncoming.quantity;
            newPrice = formatNumber(calculatedUnit);
        }
        
        // Prevent infinite loop by checking if value actually changed
        setUnitPrice(prev => {
            if (prev !== newPrice) {
                // Also update total sum if quantity exists
                if (quantity) {
                    const sum = parseNumber(quantity) * parseNumber(newPrice);
                    setTotalSum(sum ? formatNumber(sum) : '');
                }
                return newPrice;
            }
            return prev;
        });
    }
  }, [selectedProduct, opType, operations]);

  const handleQuantityChange = (val: string) => {
      // Allow only numbers and decimal point
      const rawVal = val.replace(/[^0-9.]/g, '');
      setQuantity(rawVal);
      
      const parsedQty = parseFloat(rawVal);
      const parsedPrice = parseNumber(unitPrice);
      
      if (parsedPrice && !isNaN(parsedQty)) {
          const sum = parsedQty * parsedPrice;
          setTotalSum(sum ? formatNumber(sum) : '');
      }
  };

  const handleUnitPriceChange = (val: string) => {
      // Remove non-numeric chars except dot
      const raw = val.replace(/[^0-9.]/g, '');
      if (!raw) {
          setUnitPrice('');
          setTotalSum('');
          return;
      }
      
      // Format for display
      const num = parseFloat(raw);
      const formatted = formatNumber(num);
      
      // If user is typing decimal, don't format yet or it messes up
      // Actually, simple formatNumber removes decimals if not handled carefully
      // Let's just use the raw input for now but formatted display logic is tricky with standard input
      // BETTER APPROACH: Just format on blur? User said "while typing".
      // Let's try to format as they type but keep cursor position is hard.
      // Simplified: Just use space separation for thousands.
      
      // Custom formatter that preserves partial input
      const parts = raw.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const newVal = parts.join('.');
      
      setUnitPrice(newVal);
      
      const parsedQty = parseFloat(quantity);
      const parsedPrice = parseFloat(raw);
      
      if (!isNaN(parsedQty) && !isNaN(parsedPrice)) {
          const sum = parsedQty * parsedPrice;
          setTotalSum(formatNumber(sum));
      }
  };

  const handleTotalSumChange = (val: string) => {
      const raw = val.replace(/[^0-9.]/g, '');
      if (!raw) {
          setTotalSum('');
          return;
      }

      const parts = raw.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const newVal = parts.join('.');
      
      setTotalSum(newVal);
      
      const parsedQty = parseFloat(quantity);
      const parsedSum = parseFloat(raw);
      
      if (!isNaN(parsedQty) && parsedQty !== 0 && !isNaN(parsedSum)) {
          const price = parsedSum / parsedQty;
          setUnitPrice(price ? formatNumber(price) : '');
      }
  };

  const handleSubmit = () => {
    if (!selectedKitchen) return;
    if (opType === 'TRANSFER' && !targetKitchen) return;
    if (opType !== 'SALE' && (!productSearch || !quantity || isProductError || !selectedProduct)) return;
    if (opType === 'SALE' && !unitPrice) return;

    let prodId: number | null = null;
    let prodName = 'Direct Sales';
    let prodUnit = 'unit';
    let qtyNum = 1;

    if (opType !== 'SALE' && selectedProduct) {
        prodName = selectedProduct.name;
        prodId = selectedProduct.id;
        prodUnit = selectedProduct.unit;
        qtyNum = Number(quantity);
    } else if (opType === 'SALE' && quantity) {
        qtyNum = Number(quantity);
    }

    // Calculate Total Price (Quantity * Unit Price)
    const parsedPrice = parseNumber(unitPrice);
    const finalPrice = parsedPrice ? parsedPrice * qtyNum : undefined;

    addOperation({
      type: opType,
      date,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      kitchenId: selectedKitchen,
      kitchenName: kitchens.find(k => String(k.id) === selectedKitchen)?.name || 'Unknown',
      toKitchenId: opType === 'TRANSFER' ? targetKitchen : undefined,
      toKitchenName: opType === 'TRANSFER' ? kitchens.find(k => String(k.id) === targetKitchen)?.name : undefined,
      productId: prodId,
      productName: prodName,
      quantity: qtyNum,
      unit: prodUnit,
      price: finalPrice
    });

    setProductSearch('');
    setQuantity('');
    setUnitPrice('');
    setTotalSum('');
    setTimeout(() => {
      if (opType === 'SALE') revenueRef.current?.focus();
      else productRef.current?.focus();
    }, 50);
  };

  // --- REQUIREMENT 3: Fix Edit Logic ---
  const handleOpenEdit = (op: OperationEntry) => {
    setEditingOp(op);
    setEditFormData({ ...op });
    
    // Calculate unit price for the edit modal
    const uPrice = op.price && op.quantity ? (op.price / op.quantity) : 0;
    
    // Initialize formatted strings
    setEditQtyStr(op.quantity ? formatNumber(op.quantity) : '');
    setEditUnitPriceStr(uPrice ? formatNumber(uPrice) : '');
    setEditTotalPriceStr(op.price ? formatNumber(op.price) : '');
    
    setEditUnitPrice(uPrice.toString()); // Keep this for logic if needed, but we rely on Str now
    setIsEditModalOpen(true);
  };

  const handleEditChange = (field: keyof OperationEntry, value: any) => {
      setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditQtyChange = (val: string) => {
      const raw = val.replace(/[^0-9.]/g, '');
      
      // Format with spaces
      const parts = raw.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const formatted = parts.join('.');
      
      setEditQtyStr(formatted);
      
      const qty = parseFloat(raw);
      const uPrice = parseNumber(editUnitPriceStr);
      
      setEditFormData(prev => ({ ...prev, quantity: isNaN(qty) ? 0 : qty }));
      
      if (!isNaN(qty) && uPrice !== undefined) {
          const total = qty * uPrice;
          setEditFormData(prev => ({ ...prev, price: total }));
          setEditTotalPriceStr(formatNumber(total));
      }
  };

  const handleEditUnitPriceChange = (val: string) => {
      const raw = val.replace(/[^0-9.]/g, '');
      
      const parts = raw.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const formatted = parts.join('.');
      
      setEditUnitPriceStr(formatted);
      
      const uPrice = parseFloat(raw);
      const qty = editFormData.quantity || 0;
      
      if (!isNaN(uPrice)) {
          const total = qty * uPrice;
          setEditFormData(prev => ({ ...prev, price: total }));
          setEditTotalPriceStr(formatNumber(total));
      }
  };

  const handleEditTotalPriceChange = (val: string) => {
      const raw = val.replace(/[^0-9.]/g, '');
      
      const parts = raw.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const formatted = parts.join('.');
      
      setEditTotalPriceStr(formatted);
      
      const total = parseFloat(raw);
      const qty = editFormData.quantity || 0;
      
      setEditFormData(prev => ({ ...prev, price: isNaN(total) ? 0 : total }));

      if (!isNaN(total) && qty > 0) {
          const uPrice = total / qty;
          setEditUnitPriceStr(formatNumber(uPrice));
      }
  };

  const handleUpdate = () => {
    if (editingOp && editFormData.id) {
      updateOperation(editingOp.id, editFormData);
      setIsEditModalOpen(false);
      setEditingOp(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteOperation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      switch (currentField) {
        case 'kitchen': 
          if (opType === 'TRANSFER') targetKitchenRef.current?.focus();
          else if (opType === 'SALE') revenueRef.current?.focus();
          else productRef.current?.focus();
          break;
        case 'targetKitchen': productRef.current?.focus(); break;
        case 'product': if (!isProductError && selectedProduct) quantityRef.current?.focus(); break;
        case 'quantity': if (opType === 'DAILY') priceRef.current?.focus(); else priceRef.current?.focus(); break;
        case 'price': totalSumRef.current?.focus(); break;
        case 'revenue': handleSubmit(); break;
        case 'totalSum': handleSubmit(); break;
      }
    }
  };

  const filteredHistory = operations.filter(op => {
      const matchesSearch = op.productName.toLowerCase().includes(histSearch.toLowerCase());
      const matchesKitchen = histKitchen === 'all' || String(op.kitchenId) === histKitchen;
      const matchesType = op.type === histType;
      const opDate = new Date(op.date);
      const matchesFrom = !histDateFrom || opDate >= new Date(histDateFrom);
      const matchesTo = !histDateTo || opDate <= new Date(histDateTo);
      return matchesSearch && matchesKitchen && matchesType && matchesFrom && matchesTo;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- REQUIREMENT 2: Styled Excel Export (Uzbek) ---
  const handleExportExcel = () => {
    const kitchenName = histKitchen === 'all' 
        ? 'Barcha oshxonalar' 
        : kitchens.find(k => String(k.id) === histKitchen)?.name || 'Noma\'lum';
    
    // Determine report title based on history type filter
    let reportTitle = 'Hisobot';
    if (histType === 'INCOMING') reportTitle = 'Kirim Hisoboti';
    else if (histType === 'DAILY') reportTitle = 'Qoldiq Hisoboti';
    else if (histType === 'TRANSFER') reportTitle = 'O\'tkazma Hisoboti';
    else if (histType === 'SALE') reportTitle = 'Sotuv Hisoboti';

    const totalSum = filteredHistory.reduce((sum, op) => sum + (op.price || 0), 0);

    // Construct HTML Table
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
              <td colspan="6" class="header" style="font-size: 18px; text-align: center; background-color: #e2e8f0;">${reportTitle}</td>
           </tr>
           <tr>
              <td colspan="2" class="subheader"><b>Oshxona:</b> ${kitchenName}</td>
              <td colspan="2" class="subheader"><b>Sana:</b> ${formatDate(new Date())}</td>
              <td colspan="2" class="subheader"><b>Davr:</b> ${formatDate(histDateFrom)} - ${formatDate(histDateTo)}</td>
           </tr>
           <tr><td colspan="6"></td></tr>
           <tr style="background-color: #cbd5e1;">
              <th class="table-head">Sana</th>
              <th class="table-head">Mahsulot (Xom ashyo)</th>
              <th class="table-head">O'lchov</th>
              <th class="table-head">Miqdor (Kol-vo)</th>
              <th class="table-head">Narx (Tsena)</th>
              <th class="table-head">Summa</th>
           </tr>
    `;

    filteredHistory.forEach(op => {
       const unitPrice = (op.price && op.quantity) ? (op.price / op.quantity) : 0;
       tableHTML += `
         <tr>
            <td class="cell">${formatDate(op.date)}</td>
            <td class="cell">${op.productName}</td>
            <td class="cell" style="text-align: center;">${op.unit}</td>
            <td class="cell num" style="text-align: center;">${op.quantity}</td>
            <td class="cell num" style="text-align: right;">${unitPrice}</td>
            <td class="cell num" style="text-align: right;">${op.price || 0}</td>
         </tr>
       `;
    });

    tableHTML += `
           <tr>
              <td colspan="4"></td>
              <td class="subheader" style="text-align: right;"><b>JAMI (ITOGO):</b></td>
              <td class="subheader num" style="text-align: right; background-color: #f1f5f9;"><b>${totalSum}</b></td>
           </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle}_${formatDate(new Date())}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAmount = filteredHistory.reduce((sum, op) => sum + (op.price || 0), 0);
  
  const totalQuantities = filteredHistory.reduce((acc, op) => {
    const unit = op.unit || 'units';
    acc[unit] = (acc[unit] || 0) + Number(op.quantity);
    return acc;
  }, {} as Record<string, number>);

  const config = {
    DAILY: { title: t('qi.op.daily'), qtyLabel: t('qi.balance'), showPrice: true, priceLabel: t('qi.price'), showTargetKitchen: false, qtyPlaceholder: '0' },
    INCOMING: { title: t('qi.op.incoming'), qtyLabel: t('qi.qty'), showPrice: true, priceLabel: t('qi.price'), showTargetKitchen: false, qtyPlaceholder: '0.000' },
    TRANSFER: { title: t('qi.op.transfer'), qtyLabel: t('qi.qty'), showPrice: true, priceLabel: t('qi.price'), showTargetKitchen: true, qtyPlaceholder: '0.000' },
    SALE: { title: t('qi.op.sale'), qtyLabel: t('qi.qty'), showPrice: true, priceLabel: t('qi.revenue'), showTargetKitchen: false, qtyPlaceholder: '0' },
  }[opType] || { title: 'Operation', qtyLabel: 'Qty', showPrice: true, showTargetKitchen: false };

  const getOpTypeLabel = (id: string) => {
    return {
        INCOMING: t('qi.op.incoming'),
        DAILY: t('qi.op.daily'),
        TRANSFER: t('qi.op.transfer'),
        SALE: t('qi.op.sale'),
    }[id] || id;
  };

  return (
    <div className="space-y-6">
      {/* Quick Input Form */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/60 p-6 relative lg:sticky lg:top-0 z-30 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 border-b border-slate-100/50 pb-4 gap-4">
           <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="p-2 bg-slate-50 rounded-xl">
                <Zap size={20} className="text-slate-400" fill="currentColor" />
             </div>
             <h2 className="font-display font-bold text-lg text-slate-800">{t('qi.title')}</h2>
           </div>
           
           <div className="flex bg-slate-50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              {OPERATION_TYPES.map(t_op => (
                <button
                  key={t_op.id}
                  onClick={() => setOpType(t_op.id as OperationType)}
                  className={`
                    flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                    ${opType === t_op.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}
                  `}
                >
                  {getOpTypeLabel(t_op.id)}
                </button>
              ))}
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="w-full md:w-40 flex-shrink-0">
            <Input label={t('qi.date')} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="w-full md:flex-1">
            <Select 
              ref={kitchenRef}
              label={opType === 'TRANSFER' ? t('qi.from_kitchen') : t('qi.kitchen')}
              options={kitchens.map(k => ({ value: k.id, label: k.name }))}
              value={selectedKitchen}
              onChange={e => setSelectedKitchen(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'kitchen')}
            />
          </div>
          {config.showTargetKitchen && (
             <div className="w-full md:flex-1">
              <Select 
                ref={targetKitchenRef}
                label={t('qi.to_kitchen')}
                options={kitchens.filter(k => k.id !== selectedKitchen).map(k => ({ value: k.id, label: k.name }))}
                value={targetKitchen}
                onChange={e => setTargetKitchen(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'targetKitchen')}
              />
            </div>
          )}
          {opType !== 'SALE' && (
            <div className="w-full md:flex-[1.5]">
              <div className="relative">
                <Input 
                  ref={productRef}
                  label={t('qi.product')} 
                  placeholder={t('qi.product_ph')} 
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'product')}
                  list="products-list"
                  icon={<ScanLine size={16} />}
                  className={`${selectedProduct ? "border-emerald-500 pr-36" : ""} ${isProductError ? "border-red-300 pr-32" : ""}`}
                />
                {selectedProduct && (
                  <div className="absolute right-2 top-[34px] animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-none z-10">
                    <div className="bg-emerald-50/90 backdrop-blur-md border border-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                       {selectedProduct.name}
                    </div>
                  </div>
                )}
                {isProductError && (
                  <div className="absolute right-2 top-[34px] animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-none z-10">
                     <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                       {t('qi.not_found')}
                    </div>
                  </div>
                )}
              </div>
              <datalist id="products-list">
                {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
          )}
          {opType !== 'SALE' && (
            <div className="w-full md:w-32 flex-shrink-0">
              <div className="relative">
                 <Input 
                  ref={quantityRef}
                  label={config.qtyLabel}
                  type="number" 
                  placeholder={config.qtyPlaceholder} 
                  value={quantity}
                  onChange={e => handleQuantityChange(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'quantity')}
                />
                 <span className="absolute right-3 top-[40px] text-xs font-bold text-slate-400 pointer-events-none">
                  {selectedProduct ? selectedProduct.unit : ''}
                </span>
              </div>
            </div>
          )}
          {(config.showPrice || opType === 'SALE') && (
            <div className={`w-full ${opType === 'SALE' ? 'md:flex-[1.5]' : 'md:w-32 flex-shrink-0'} flex flex-col`}>
              <div className="flex gap-2 items-end">
                <Input 
                  ref={opType === 'SALE' ? revenueRef : priceRef}
                  label={config.priceLabel}
                  type="text" 
                  placeholder="0.00" 
                  value={unitPrice}
                  onChange={e => handleUnitPriceChange(e.target.value)}
                  onFocus={(e) => opType !== 'SALE' && e.target.select()}
                  onKeyDown={(e) => handleKeyDown(e, opType === 'SALE' ? 'revenue' : 'price')}
                  className="flex-1"
                />
              </div>
            </div>
          )}
          {(config.showPrice || opType === 'SALE') && opType !== 'SALE' && (
             <div className="w-full md:w-32 flex-shrink-0">
                 <Input 
                    ref={totalSumRef}
                    label="Сумма"
                    type="text"
                    placeholder="0.00"
                    value={totalSum}
                    onChange={e => handleTotalSumChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => handleKeyDown(e, 'totalSum')}
                 />
             </div>
          )}
           <div className="w-full md:w-auto flex-shrink-0">
             <Button variant="primary" onClick={handleSubmit} className="h-[46px] w-full md:w-auto mt-1 px-8" disabled={!!isProductError}>
               {t('qi.save')}
             </Button>
           </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
                {/* Title Block */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl">
                        <Clock size={20} className="text-slate-400" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-slate-800">{t('qi.history')}</h3>
                </div>

                {/* Filters Grid */}
                <div className="w-full xl:w-auto grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="col-span-1 sm:col-span-2 md:w-64 relative group">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors pointer-events-none" />
                        <input 
                        type="text" 
                        placeholder={t('qi.search_ph')} 
                        value={histSearch}
                        onChange={e => setHistSearch(e.target.value)}
                        className="w-full bg-slate-50 border-transparent focus:bg-white border focus:border-slate-300 text-slate-800 text-sm font-medium py-0 pl-10 pr-4 h-11 rounded-xl focus:ring-4 focus:ring-slate-100 focus:outline-none transition-all placeholder-slate-400"
                        />
                    </div>

                    {/* Kitchen Filter */}
                    {showKitchenFilter && (
                        <div className="col-span-1 md:w-40 relative group">
                            <select 
                                className="w-full bg-slate-50 border-transparent focus:bg-white border focus:border-slate-300 text-slate-800 text-sm font-medium py-0 pl-3.5 pr-8 h-11 rounded-xl focus:ring-4 focus:ring-slate-100 focus:outline-none appearance-none cursor-pointer transition-all"
                                value={histKitchen}
                                onChange={e => setHistKitchen(e.target.value)}
                            >
                                <option value="all">{t('qi.all_kitchens')}</option>
                                {kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600" />
                        </div>
                    )}

                    {/* Type Filter */}
                    <div className={`${showKitchenFilter ? 'col-span-1' : 'col-span-1 sm:col-span-2'} md:w-36 relative group`}>
                        <select 
                            className="w-full bg-slate-50 border-transparent focus:bg-white border focus:border-slate-300 text-slate-800 text-sm font-medium py-0 pl-3.5 pr-8 h-11 rounded-xl focus:ring-4 focus:ring-slate-100 focus:outline-none appearance-none cursor-pointer transition-all"
                            value={histType}
                            onChange={e => setHistType(e.target.value)}
                        >
                            {OPERATION_TYPES.map(t_op => <option key={t_op.id} value={t_op.id}>{getOpTypeLabel(t_op.id)}</option>)}
                        </select>
                        <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600" />
                    </div>

                    {/* Date Range */}
                    <div className="col-span-1 md:w-36 relative">
                        <Input 
                            type="date" 
                            value={histDateFrom} 
                            onChange={e => setHistDateFrom(e.target.value)} 
                            className="w-full bg-slate-50 border-transparent focus:bg-white border focus:border-slate-300 text-slate-800 text-sm font-medium py-0 pl-3.5 pr-2 h-11 rounded-xl focus:ring-4 focus:ring-slate-100 focus:outline-none transition-all cursor-pointer"
                        />
                    </div>
                    <div className="col-span-1 md:w-36 relative">
                        <Input 
                            type="date" 
                            value={histDateTo} 
                            onChange={e => setHistDateTo(e.target.value)} 
                            className="w-full bg-slate-50 border-transparent focus:bg-white border focus:border-slate-300 text-slate-800 text-sm font-medium py-0 pl-3.5 pr-2 h-11 rounded-xl focus:ring-4 focus:ring-slate-100 focus:outline-none transition-all cursor-pointer" 
                        />
                    </div>

                    {/* Excel Export Button */}
                    <div className="col-span-1 sm:col-span-2 md:w-auto">
                        <Button variant="secondary" onClick={handleExportExcel} className="w-full md:w-11 h-11 p-0 flex items-center justify-center border-slate-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200">
                            <div className="flex items-center gap-2 md:justify-center">
                                <Download size={20} />
                                <span className="md:hidden">Export</span>
                            </div>
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-2 sm:p-6">
          <div className="space-y-4">
            {filteredHistory.length > 0 ? (
                <>
                {/* Summary / Totals Header */}
                <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 mb-4 flex flex-col lg:flex-row items-center justify-between gap-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                       <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                         <Sigma size={18} className="text-slate-400" />
                       </div>
                       {t('qi.total_count')}: <span className="text-slate-900 font-bold text-lg">{filteredHistory.length}</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-end w-full lg:w-auto">
                       {/* Display quantities by unit */}
                       <div className="flex flex-wrap justify-center gap-3">
                           {Object.entries(totalQuantities).map(([unit, qty]) => (
                               <div key={unit} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                  <span className="text-xs text-slate-400 font-bold uppercase">{unit}</span>
                                  <span className="font-bold text-slate-900">{formatNumber(qty)}</span>
                               </div>
                           ))}
                       </div>
                       
                       {/* Total Price */}
                       {totalAmount > 0 && (
                           <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-xl border border-emerald-100 shadow-sm ring-4 ring-emerald-50/50">
                              <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">{t('qi.total_amount') || 'Total'}</span>
                              <span className="font-display font-bold text-xl text-emerald-700">{formatNumber(totalAmount)} <span className="text-sm font-medium text-emerald-500">sum</span></span>
                           </div>
                       )}
                    </div>
                 </div>

                {paginatedHistory.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all gap-4 relative">
                        <div className="flex items-start gap-4 flex-1">
                        <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm
                            ${entry.type === 'INCOMING' ? 'bg-blue-600 text-white' : 
                                entry.type === 'TRANSFER' ? 'bg-purple-600 text-white' :
                                entry.type === 'SALE' ? 'bg-emerald-600 text-white' :
                                'bg-amber-500 text-white'}
                        `}>
                            <CheckCircle2 size={24} strokeWidth={2.5} />
                        </div>
                        
                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-base text-slate-900 truncate">{entry.productName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                                entry.type === 'INCOMING' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                entry.type === 'TRANSFER' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                entry.type === 'SALE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                {getOpTypeLabel(entry.type)}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1.5 gap-x-4">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <Calendar size={13} className="text-slate-300" />
                                {formatDate(entry.date)} <span className="text-slate-200">|</span> {entry.time}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <MapPin size={13} className="text-slate-300" />
                                {entry.type === 'TRANSFER' ? `${entry.kitchenName} → ${entry.toKitchenName}` : entry.kitchenName}
                                </div>
                                {entry.price && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                    <DollarSign size={13} className="text-slate-300" />
                                    <span className={entry.type === 'SALE' ? 'text-emerald-600' : entry.type === 'INCOMING' ? 'text-blue-600' : ''}>
                                        {/* Display Unit Price: Total Price / Quantity */}
                                        {formatNumber(entry.price / (entry.quantity || 1))}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal"> / {entry.unit}</span>
                                </div>
                                )}
                            </div>
                        </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0">
                        <div className="text-left md:text-right px-2">
                            <div className="font-display font-bold text-slate-900 text-xl flex items-center gap-2 justify-start md:justify-end">
                            <Package size={16} className="text-slate-300" />
                            {entry.quantity} <span className="text-sm font-body font-medium text-slate-400 uppercase tracking-tighter">{entry.unit}</span>
                            </div>
                            {/* Display Total Price */}
                            {entry.price && (
                                <div className={`text-sm font-bold mt-1 ${
                                    entry.type === 'SALE' ? 'text-emerald-600' : 
                                    entry.type === 'INCOMING' ? 'text-blue-600' : 'text-slate-500'
                                }`}>
                                    {formatNumber(entry.price)} sum
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-1.5">
                            <button 
                                type="button"
                                onClick={() => handleOpenEdit(entry)} 
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 bg-slate-50 shadow-sm"
                                title="Edit"
                            >
                                <Edit2 size={18} />
                            </button>
                            {userRole !== 'KITCHEN_USER' && (
                                <button 
                                    type="button"
                                    onClick={() => handleDelete(entry.id)} 
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-red-50 bg-red-50/30 shadow-sm"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        </div>
                    </div>
                ))}

                {/* Pagination Controls */}
                {filteredHistory.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{t('common.show')}</span>
                      <select 
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                      <span>{t('common.entries')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                      >
                        {t('common.prev')}
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Simple logic to show first 5 pages or sliding window could be implemented
                          // For now, let's just show current page and neighbors if many pages
                          let p = i + 1;
                          if (totalPages > 5 && currentPage > 3) {
                             p = currentPage - 2 + i;
                             if (p > totalPages) p = totalPages - (4 - i);
                          }
                          
                          return (
                            <button
                              key={p}
                              onClick={() => handlePageChange(p)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === p
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                  </div>
                )}
                </>
            ) : (
              <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                   <Clock size={24} />
                 </div>
                 <p className="text-slate-400 text-sm font-medium">{t('qi.no_history')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Entry">
        <div className="space-y-5">
           <div className="grid grid-cols-2 gap-4">
              <Input label="Date" type="date" value={editFormData.date || ''} onChange={e => handleEditChange('date', e.target.value)} />
              <Input label="Time" type="time" value={editFormData.time || ''} onChange={e => handleEditChange('time', e.target.value)} />
           </div>
           
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product Details</div>
              <div className="font-bold text-slate-900">{editFormData.productName}</div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <Input label="Quantity" type="text" value={editQtyStr} onChange={e => handleEditQtyChange(e.target.value)} />
              <Input 
                  label="Unit Price"
                  type="text"
                  value={editUnitPriceStr}
                  onChange={e => handleEditUnitPriceChange(e.target.value)}
              />
           </div>
           
           <Input 
               label="Total Price" 
               type="text" 
               value={editTotalPriceStr} 
               onChange={e => handleEditTotalPriceChange(e.target.value)} 
           />

           <div className="pt-4 flex gap-3">
             <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} fullWidth>Cancel</Button>
             <Button onClick={handleUpdate} fullWidth>Save Changes</Button>
           </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Delete"
      >
        <div className="text-center py-4">
           <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <Trash2 size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-900 mb-2">{t('prod.delete_confirm')}</h3>
           <p className="text-slate-500 text-sm mb-6">
             Are you sure you want to delete this operation? This action cannot be undone.
           </p>
           <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} className="flex-1">Cancel</Button>
              <Button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20">Delete</Button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuickInput;
