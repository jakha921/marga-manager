
import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Trash2, Edit2, Filter, Barcode, AlertCircle, ListTree, Check } from 'lucide-react';

const Products: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory } = useData();
  const { t } = useLanguage();
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  
  // Forms
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', category: '', unit: 'kg' });
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories]);

  const categoryFilterOptions = ['All', ...categories.map(c => c.name)];

  const unitOptions = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'L', label: 'Liter (L)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'srv', label: 'Serving (srv)' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const generateNextCode = () => {
    const codes = products.map(p => parseInt(p.code)).filter(c => !isNaN(c));
    if (codes.length === 0) return '1001';
    return (Math.max(...codes) + 1).toString();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setError(null);
    setFormData({ 
      code: generateNextCode(), 
      name: '', 
      category: categories[0]?.name || '', 
      unit: 'kg' 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    setEditingId(product.id);
    setError(null);
    setFormData({
      code: product.code || '',
      name: product.name,
      category: product.category,
      unit: product.unit
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    setError(null);
    if (!formData.name || !formData.unit || !formData.code || !formData.category) return;

    let result;
    if (editingId) {
      result = updateProduct(editingId, formData);
    } else {
      result = addProduct(formData);
    }

    if (result.success) {
      setIsModalOpen(false);
    } else {
      setError(result.error || 'Unknown error');
    }
  };

  // Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  // Category Logic
  const handleSaveCategory = () => {
    if (!newCatName.trim()) return;
    if (editingCatId) {
      updateCategory(editingCatId, newCatName);
    } else {
      addCategory(newCatName);
    }
    setNewCatName('');
    setEditingCatId(null);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-2.5 rounded-2xl shadow-card flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100">
         <div className="flex items-center gap-2 w-full sm:w-auto px-2">
           <Input 
             placeholder={t('prod.search_ph')}
             icon={<Search size={16} />}
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="border-none bg-slate-50 focus:bg-slate-100 min-w-[280px]"
           />
           <div className="relative">
             <select 
               className="appearance-none bg-slate-50 py-3 pl-4 pr-10 rounded-xl text-[13px] font-medium text-slate-600 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors border-none"
               value={categoryFilter}
               onChange={e => setCategoryFilter(e.target.value)}
             >
                {categoryFilterOptions.map(c => <option key={c} value={c}>{c === 'All' ? t('prod.cat.all') : c}</option>)}
             </select>
             <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
           </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
           <Button variant="secondary" onClick={() => setIsCatModalOpen(true)}>
             <ListTree size={16} /> Categories
           </Button>
           <Button onClick={handleOpenCreate} className="shadow-lg shadow-slate-900/10">
             <Plus size={16} strokeWidth={3} /> {t('prod.add')}
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display w-24">{t('prod.code')}</th>
                <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">{t('prod.name')}</th>
                <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">{t('prod.category')}</th>
                <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display text-right">{t('prod.unit')}</th>
                <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display text-right">{t('kit.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(product => (
                <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                   <td className="py-5 px-8">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      {product.code || '-'}
                    </span>
                  </td>
                  <td className="py-5 px-8">
                    <span className="font-bold text-sm text-slate-900">{product.name}</span>
                  </td>
                  <td className="py-5 px-8">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider border border-slate-200">
                       {product.category}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right font-mono text-sm font-medium text-slate-500">
                     {product.unit}
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenEdit(product)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      {userRole !== 'KITCHEN_USER' && (
                        <button onClick={() => handleDeleteClick(product.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">
                    {t('prod.no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? t('prod.modal.edit') : t('prod.modal.add')}
      >
        <div className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="col-span-1">
                <Input 
                  label={t('prod.code')} 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})} 
                  placeholder="0000"
                  icon={<Barcode size={16} />}
                />
             </div>
             <div className="col-span-1 sm:col-span-2">
               <Input 
                label={t('prod.name')}
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                autoFocus
              />
             </div>
          </div>
         
          <Select 
            label={t('prod.category')}
            value={formData.category} 
            onChange={e => setFormData({...formData, category: e.target.value})} 
            options={categories.map(c => ({ value: c.name, label: c.name }))}
          />
          
          <Select
             label={t('prod.unit')}
             value={formData.unit}
             onChange={e => setFormData({...formData, unit: e.target.value})}
             options={unitOptions}
          />
          
          <div className="pt-4">
            <Button onClick={handleSubmit} fullWidth>{editingId ? t('prod.update') : t('prod.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('prod.delete_title')}
      >
        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            {t('prod.delete_confirm')}
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Manage Categories"
      >
        <div className="space-y-6">
          <div className="flex gap-2">
            <Input 
              placeholder="New Category Name..." 
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
            />
            <Button onClick={handleSaveCategory} className="flex-shrink-0">
              {editingCatId ? <Check size={18} /> : <Plus size={18} />}
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingCatId(cat.id); setNewCatName(cat.name); }}
                    className="p-1.5 text-slate-400 hover:text-slate-900"
                  >
                    <Edit2 size={14} />
                  </button>
                  {userRole !== 'KITCHEN_USER' && (
                    <button 
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
