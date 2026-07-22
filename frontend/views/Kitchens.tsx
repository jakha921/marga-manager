
import React, { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Kitchen } from '../types';
import { Search, Plus, Trash2, Edit2, Filter, Crown, AlertTriangle, Check } from 'lucide-react';

const Kitchens: React.FC = () => {
  const { kitchens, addKitchen, updateKitchen, deleteKitchen, subscription, upgradeSubscription, currentOrganization, loading } = useData();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [error, setError] = useState<string | null>(null);

  const filteredKitchens = kitchens.filter(k => 
    k.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maxKitchens = currentOrganization?.maxKitchens || 1;
  const canAddKitchen = kitchens.length < maxKitchens;

  const handleOpenCreate = () => {
    if (!canAddKitchen) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setError(null);
    setEditingId(null);
    setFormData({ name: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (kitchen: Kitchen) => {
    setEditingId(kitchen.id);
    setFormData({
      name: kitchen.name,
      isActive: kitchen.isActive
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return; // Simple validation

    if (editingId) {
      await updateKitchen(editingId, formData);
      setIsModalOpen(false);
    } else {
      const result = await addKitchen(formData);
      if (result.success) {
        setIsModalOpen(false);
      } else {
        setError(result.error || 'Limit reached');
      }
    }
  };

  const handleDelete = (id: string | number) => {
    if (confirm(t('kit.delete_confirm'))) {
      deleteKitchen(id);
    }
  };

  // Mock SaaS Upgrade
  const handleUpgrade = () => {
    upgradeSubscription('PRO');
    setIsUpgradeModalOpen(false);
  };

  if (loading) return <Skeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* Plan Info Card */}
      <div className="bg-[var(--color-primary)] rounded-2xl p-6 text-[var(--bg-surface)] shadow-lg shadow-[var(--color-primary)]/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${subscription !== 'BASIC' ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-surface)]/10 text-white'}`}>
             <Crown size={24} strokeWidth={2} className={subscription !== 'BASIC' ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
               <h2 className="font-display font-bold text-lg">{subscription} PLAN</h2>
            </div>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">
              {currentOrganization?.name || ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 relative z-10 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <div className="flex items-end justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('saas.current_usage')}</span>
              <span className="text-sm font-bold">{kitchens.length} <span className="text-[var(--text-secondary)]">/ {maxKitchens}</span></span>
            </div>
            <div className="w-full md:w-48 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${subscription !== 'BASIC' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((kitchens.length / maxKitchens) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          {subscription === 'BASIC' && (
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-5 py-2.5 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors whitespace-nowrap shadow-md"
            >
              {t('saas.upgrade_btn')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] p-2.5 rounded-2xl shadow-card flex flex-col sm:flex-row items-center justify-between gap-4 border border-[var(--border-light)]">
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
           <Input 
             placeholder={t('kit.search_ph')}
             icon={<Search size={16} />}
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="border-none bg-[var(--bg-surface-2)] focus:bg-[var(--bg-surface-2)] min-w-[280px]"
           />
           <button className="p-3 bg-[var(--bg-surface-2)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-color)] transition-colors">
             <Filter size={18} />
           </button>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto px-2">
           <Button onClick={handleOpenCreate} className="shadow-lg shadow-[var(--color-primary)]/10">
             <Plus size={16} strokeWidth={3} /> {t('kit.add')} 
           </Button>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-3xl shadow-card overflow-hidden border border-[var(--border-light)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-surface-2)]/50 border-b border-[var(--border-light)]">
                <th className="py-5 px-8 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">{t('kit.name')}</th>
                <th className="py-5 px-8 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">{t('kit.status')}</th>
                <th className="py-5 px-8 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display text-right">{t('kit.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredKitchens.map(kitchen => (
                <tr key={kitchen.id} className="group hover:bg-[var(--bg-surface-2)]/50 transition-colors">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs shadow-inner">
                        {kitchen.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                         <span className="block font-bold text-sm text-[var(--text-primary)]">{kitchen.name}</span>
                         
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-8">
                     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${kitchen.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${kitchen.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                       {kitchen.isActive ? t('kit.active') : t('kit.inactive')}
                     </span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenEdit(kitchen)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(kitchen.id)} className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredKitchens.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-[var(--text-muted)] font-medium">
                    {t('kit.no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? t('kit.modal.edit') : t('kit.modal.add')}
      >
        <div className="space-y-6">
           {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2">
               <AlertTriangle size={16} /> {error}
            </div>
           )}
          <Input 
            label={t('kit.name')} 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            autoFocus
          />
          
          <div className="p-4 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-light)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[var(--text-primary)]">{t('kit.modal.status_label')}</span>
              <span className="text-[11px] text-[var(--text-secondary)]">{t('kit.modal.status_desc')}</span>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.isActive} 
                onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-[var(--bg-surface)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>

          <div className="pt-2">
            <Button onClick={handleSubmit} fullWidth>{editingId ? t('kit.update') : t('kit.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Upgrade Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title={t('saas.upgrade_title')}
      >
        <div className="text-center py-4">
           <div className="w-16 h-16 bg-[var(--bg-surface-2)] rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
              <AlertTriangle size={32} />
           </div>
           <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('saas.limit_reached')}</h3>
           <p className="text-[var(--text-secondary)] text-sm mb-8 px-4">
             {t('saas.limit_desc')} {t('saas.upgrade_desc')}
           </p>

           <div className="bg-[var(--bg-surface-2)] rounded-2xl p-6 mb-8 text-left border border-[var(--border-light)]">
              <h4 className="font-bold text-[var(--text-primary)] text-sm mb-4">{t('kit.pro_plan_includes')}</h4>
              <ul className="space-y-3">
                 <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                       <Check size={12} strokeWidth={3} />
                    </div>
                    {t('saas.pro_features')}
                 </li>
                 <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                       <Check size={12} strokeWidth={3} />
                    </div>
                    {t('kit.feature.analytics')}
                 </li>
                 <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                       <Check size={12} strokeWidth={3} />
                    </div>
                    {t('kit.feature.priority')}
                 </li>
              </ul>
           </div>

           <Button onClick={handleUpgrade} fullWidth className="bg-[var(--color-primary)] hover:bg-[var(--border-color)] text-[var(--bg-surface)] shadow-xl shadow-[var(--color-primary)]/20">
             <Crown size={18} /> {t('saas.upgrade_btn')}
           </Button>
           <button 
             onClick={() => setIsUpgradeModalOpen(false)}
             className="mt-4 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
           >
             {t('common.cancel')}
           </button>
        </div>
      </Modal>
    </div>
  );
};

export default Kitchens;
