
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Select from '../components/Select';
import Modal from '../components/Modal';
import { 
  Users, 
  Settings as SettingsIcon, 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit2, 
  User, 
  Key, 
  CheckCircle2, 
  Crown,
  AlertTriangle,
  Check,
  Building2,
  DollarSign,
  Package,
  Save
} from 'lucide-react';
import { UserRole, User as UserType, SubscriptionPlan, Organization } from '../types';

type Tab = 'general' | 'users' | 'billing';

interface PlanDetails {
    id: SubscriptionPlan;
    name: string;
    price: number;
    kitchens: number | 'Unlimited';
    users: number | 'Unlimited';
    features: string[];
}

const Settings: React.FC = () => {
  const { t } = useLanguage();
  const { users, addUser, updateUser, deleteUser, currentOrganization, upgradeSubscription, updateOrganization } = useData();
  const { username } = useAuth(); // Current logged in user
  
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // General Settings State
  const [genForm, setGenForm] = useState<Partial<Organization>>({});
  const [genSaved, setGenSaved] = useState(false);

  // User Management State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<Partial<UserType>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Billing State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<PlanDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter users for current tenant organization
  const tenantUsers = users.filter(u => u.organizationId === currentOrganization?.id);
  const maxUsers = currentOrganization?.maxUsers || 5;
  const canAddUser = tenantUsers.length < maxUsers;

  useEffect(() => {
    if (currentOrganization && activeTab === 'general') {
       setGenForm({ ...currentOrganization });
    }
  }, [currentOrganization, activeTab]);

  const PLANS: PlanDetails[] = [
    {
        id: 'BASIC',
        name: t('saas.plan.basic'),
        price: 0,
        kitchens: 1,
        users: 5,
        features: [t('bill.feature.kitchens') + ': 1', t('bill.feature.users') + ': 5', 'Basic Reporting']
    },
    {
        id: 'PRO',
        name: t('saas.plan.pro'),
        price: 49,
        kitchens: 10,
        users: 50,
        features: [t('bill.feature.kitchens') + ': 10', t('bill.feature.users') + ': 50', t('bill.feature.analytics'), t('bill.feature.support')]
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: 199,
        kitchens: 'Unlimited',
        users: 'Unlimited',
        features: ['Unlimited Everything', 'Dedicated API', 'SLA', 'Custom Onboarding']
    }
  ];

  const handleOpenAdd = () => {
    if (!canAddUser) {
        setError(t('set.users.limit'));
        return;
    }
    setEditingUserId(null);
    setUserForm({
        username: '',
        password: '',
        fullName: '',
        role: 'KITCHEN_USER', // Default for staff
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserType) => {
    setEditingUserId(user.id);
    setUserForm({ ...user });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userForm.username || !userForm.password || !userForm.fullName) return;
    if (!currentOrganization) return;

    const userData = {
        ...userForm,
        organizationId: currentOrganization.id
    } as UserType;

    // Check unique username (simple check)
    const exists = users.some(u => u.username === userData.username && u.id !== editingUserId);
    if (exists) {
        setError('Username already taken');
        return;
    }

    if (editingUserId) {
        updateUser(editingUserId, userForm);
    } else {
        addUser(userData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('set.users.delete_confirm'))) {
        deleteUser(id);
    }
  };

  const handleSaveGeneral = () => {
    if (!currentOrganization) return;
    updateOrganization(currentOrganization.id, genForm);
    setGenSaved(true);
    setTimeout(() => setGenSaved(false), 3000);
  };

  const initiateUpgrade = (plan: PlanDetails) => {
      setTargetPlan(plan);
      setIsPaymentModalOpen(true);
  };

  const handlePayment = () => {
      if (!targetPlan) return;
      setIsProcessing(true);
      
      // Simulate API call
      setTimeout(() => {
          upgradeSubscription(targetPlan.id);
          setIsProcessing(false);
          setIsPaymentModalOpen(false);
      }, 1500);
  };

  const currentUser = tenantUsers.find(u => u.username === username);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-2 overflow-hidden">
           <button 
             onClick={() => setActiveTab('general')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'general' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
           >
              <SettingsIcon size={18} /> {t('set.tab.general')}
           </button>
           <button 
             onClick={() => setActiveTab('users')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
           >
              <Users size={18} /> {t('set.tab.users')}
           </button>
           <button 
             onClick={() => setActiveTab('billing')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'billing' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
           >
              <CreditCard size={18} /> {t('set.tab.billing')}
           </button>
        </div>

        {/* Plan Summary Mini Card */}
        <div className="mt-6 bg-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="relative z-10">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Plan</h4>
              <div className="flex items-center gap-2 mb-4">
                 <Crown size={18} className="text-emerald-400" />
                 <span className="font-display font-bold text-lg">{currentOrganization?.plan}</span>
              </div>
              <div className="space-y-2">
                 <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                       <span>Users</span>
                       <span>{tenantUsers.length} / {maxUsers}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(tenantUsers.length / maxUsers) * 100}%` }}></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-3xl shadow-card border border-slate-100 p-6 lg:p-8 overflow-y-auto">
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div>
                    <h2 className="font-display font-bold text-xl text-slate-900">{t('set.tab.users')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('set.users.desc')}</p>
                 </div>
                 <Button onClick={handleOpenAdd} disabled={!canAddUser}>
                    <Plus size={18} strokeWidth={3} /> {t('set.users.add')}
                 </Button>
              </div>

              {error && (
                 <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100">
                    <AlertTriangle size={16} /> {error}
                 </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {tenantUsers.map(user => (
                    <div key={user.id} className="group p-5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-900/5 transition-all bg-slate-50/50 hover:bg-white flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm ${user.role === 'TENANT_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-white text-slate-600 border border-slate-200'}`}>
                             {user.fullName.charAt(0)}
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-900">{user.fullName}</h4>
                             <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                <span className="font-mono">@{user.username}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className={user.role === 'TENANT_ADMIN' ? 'text-purple-600' : 'text-slate-500'}>
                                   {user.role === 'TENANT_ADMIN' ? t('set.users.role.admin') : t('set.users.role.kitchen')}
                                </span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                             onClick={() => handleOpenEdit(user)}
                             className="p-2 text-slate-400 hover:text-slate-900 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-slate-300 transition-all"
                          >
                             <Edit2 size={16} />
                          </button>
                          {/* Prevent deleting yourself */}
                          {currentUser?.id !== user.id && (
                             <button 
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-slate-400 hover:text-red-600 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-red-200 transition-all"
                             >
                                <Trash2 size={16} />
                             </button>
                          )}
                       </div>
                    </div>
                 ))}
                 
                 {/* Add New Placeholder */}
                 {canAddUser && (
                    <button 
                       onClick={handleOpenAdd}
                       className="p-5 rounded-2xl border border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-600 h-full min-h-[100px]"
                    >
                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Plus size={20} />
                       </div>
                       <span className="text-xs font-bold uppercase tracking-wider">{t('set.users.add')}</span>
                    </button>
                 )}
              </div>
           </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
           <div className="space-y-8">
               <div className="flex items-center justify-between">
                 <div>
                    <h2 className="font-display font-bold text-xl text-slate-900">{t('set.tab.billing')}</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage your subscription and billing details.</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PLANS.map(plan => {
                      const isCurrent = currentOrganization?.plan === plan.id;
                      const isPro = plan.id === 'PRO';
                      
                      return (
                          <div key={plan.id} className={`relative flex flex-col p-6 rounded-3xl border transition-all duration-300 ${isCurrent ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-white shadow-lg' : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-md'}`}>
                              {isCurrent && (
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-sm tracking-wider">
                                      {t('bill.current')}
                                  </div>
                              )}
                              {isPro && !isCurrent && (
                                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl rounded-tr-2xl tracking-wider">
                                      Recommended
                                  </div>
                              )}
                              
                              <h3 className="text-lg font-bold text-slate-900 font-display mb-2">{plan.name}</h3>
                              <div className="mb-6">
                                  <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                                  <span className="text-sm text-slate-400 font-medium">{t('bill.cycle')}</span>
                              </div>

                              <ul className="space-y-3 mb-8 flex-1">
                                  {plan.features.map((feature, i) => (
                                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                          <CheckCircle2 size={16} className={`flex-shrink-0 mt-0.5 ${isCurrent ? 'text-emerald-500' : 'text-slate-400'}`} />
                                          <span className="leading-tight">{feature}</span>
                                      </li>
                                  ))}
                              </ul>

                              <Button 
                                fullWidth 
                                variant={isCurrent ? 'secondary' : 'primary'}
                                disabled={isCurrent}
                                onClick={() => initiateUpgrade(plan)}
                                className={isCurrent ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : ''}
                              >
                                {isCurrent ? t('bill.btn.current') : plan.price > (PLANS.find(p => p.id === currentOrganization?.plan)?.price || 0) ? t('bill.btn.upgrade') : t('bill.btn.downgrade')}
                              </Button>
                          </div>
                      )
                  })}
               </div>
           </div>
        )}

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
           <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                 <div>
                    <h2 className="font-display font-bold text-xl text-slate-900">{t('set.gen.profile')}</h2>
                    <p className="text-sm text-slate-500 mt-1">Basic information about your establishment.</p>
                 </div>
                 <Button onClick={handleSaveGeneral}>
                    <Save size={18} /> {t('set.gen.save')}
                 </Button>
              </div>

              {genSaved && (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold border border-emerald-100">
                  <CheckCircle2 size={18} /> {t('set.gen.saved')}
                </div>
              )}

              {/* Section 1: Identity */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                 <div className="flex items-center gap-3 text-slate-800 font-bold border-b border-slate-200 pb-2 mb-4">
                    <Building2 size={20} className="text-slate-400" />
                    Identity & Contact
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label={t('set.gen.org_name')} 
                      value={genForm.name || ''} 
                      onChange={e => setGenForm({...genForm, name: e.target.value})}
                      className="bg-white"
                    />
                    <Input 
                      label={t('set.gen.phone')} 
                      value={genForm.phone || ''} 
                      onChange={e => setGenForm({...genForm, phone: e.target.value})}
                      placeholder="+998 90 123 45 67"
                      className="bg-white"
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label={t('set.gen.email')} 
                      value={genForm.email || ''} 
                      onChange={e => setGenForm({...genForm, email: e.target.value})}
                      placeholder="info@restaurant.com"
                      className="bg-white"
                    />
                    <Input 
                      label={t('set.gen.address')} 
                      value={genForm.address || ''} 
                      onChange={e => setGenForm({...genForm, address: e.target.value})}
                      placeholder="Street, City"
                      className="bg-white"
                    />
                 </div>
              </div>

              {/* Section 2: Finance */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                 <div className="flex items-center gap-3 text-slate-800 font-bold border-b border-slate-200 pb-2 mb-4">
                    <DollarSign size={20} className="text-slate-400" />
                    {t('set.gen.finance')}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select 
                       label={t('set.gen.currency')}
                       options={[
                         { value: 'UZS', label: 'Uzbek So\'m (UZS)' },
                         { value: 'USD', label: 'US Dollar (USD)' },
                         { value: 'EUR', label: 'Euro (EUR)' }
                       ]}
                       value={genForm.currency || 'UZS'}
                       onChange={e => setGenForm({...genForm, currency: e.target.value})}
                       className="bg-white"
                    />
                    <Input 
                      label={t('set.gen.tax')} 
                      type="number"
                      value={genForm.taxRate || ''} 
                      onChange={e => setGenForm({...genForm, taxRate: Number(e.target.value)})}
                      placeholder="12"
                      className="bg-white"
                    />
                 </div>
              </div>

              {/* Section 3: Inventory */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                 <div className="flex items-center gap-3 text-slate-800 font-bold border-b border-slate-200 pb-2 mb-4">
                    <Package size={20} className="text-slate-400" />
                    {t('set.gen.inventory')}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label={t('set.gen.low_stock')} 
                      type="number"
                      value={genForm.lowStockThreshold || ''} 
                      onChange={e => setGenForm({...genForm, lowStockThreshold: Number(e.target.value)})}
                      placeholder="10"
                      className="bg-white"
                    />
                    <div className="flex items-center text-xs text-slate-500 pt-6">
                       Setting this threshold will highlight products in red within reports when stock levels fall below this value.
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* User Modal */}
      <Modal
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         title={editingUserId ? 'Edit Member' : t('set.users.add')}
      >
         <div className="space-y-4">
            {error && (
                 <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                    {error}
                 </div>
            )}
            <Input 
               label={t('set.users.fullname')}
               value={userForm.fullName || ''}
               onChange={e => setUserForm({...userForm, fullName: e.target.value})}
               placeholder="e.g. John Doe"
            />
            
            <div>
               <label className="block font-display font-bold text-[11px] text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                  {t('set.users.role')}
               </label>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                     onClick={() => setUserForm({...userForm, role: 'TENANT_ADMIN'})}
                     className={`p-3 rounded-xl border text-left transition-all ${userForm.role === 'TENANT_ADMIN' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                     <div className="font-bold text-sm text-slate-900 mb-0.5">{t('set.users.role.admin')}</div>
                     <div className="text-[10px] text-slate-500 leading-tight">Full access to settings and reports</div>
                  </button>
                  <button
                     onClick={() => setUserForm({...userForm, role: 'KITCHEN_USER'})}
                     className={`p-3 rounded-xl border text-left transition-all ${userForm.role === 'KITCHEN_USER' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                     <div className="font-bold text-sm text-slate-900 mb-0.5">{t('set.users.role.kitchen')}</div>
                     <div className="text-[10px] text-slate-500 leading-tight">Limited to Quick Input only</div>
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Input 
                  label={t('set.users.username')}
                  icon={<User size={16} />}
                  value={userForm.username || ''}
                  onChange={e => setUserForm({...userForm, username: e.target.value})}
               />
               <Input 
                  label={t('set.users.password')}
                  type="text" // Visible for admin convenience in this mock
                  icon={<Key size={16} />}
                  value={userForm.password || ''}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
               />
            </div>
            
            <div className="pt-4">
               <Button onClick={handleSaveUser} fullWidth>Save Member</Button>
            </div>
         </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t('bill.modal.title')}
      >
          <div className="space-y-6">
              <p className="text-slate-500 text-sm">{t('bill.modal.desc')}</p>
              
              {targetPlan && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-500 text-xs font-bold uppercase">{t('bill.modal.new_plan')}</span>
                          <span className="text-slate-900 font-bold font-display">{targetPlan.name}</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-slate-500 text-xs font-bold uppercase">{t('bill.modal.price')}</span>
                          <span className="text-slate-900 font-bold">${targetPlan.price} / month</span>
                      </div>
                      <div className="h-px bg-slate-200 mb-4"></div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-900 font-bold">{t('bill.modal.total')}</span>
                          <span className="text-2xl font-bold text-emerald-600">${targetPlan.price}</span>
                      </div>
                  </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                 <CreditCard size={20} className="text-slate-400" />
                 <div className="flex-1">
                    <div className="text-xs font-bold text-slate-900">•••• •••• •••• 4242</div>
                    <div className="text-[10px] text-slate-500">Expires 12/28</div>
                 </div>
                 <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Change</button>
              </div>

              <div className="pt-2">
                  <Button 
                    fullWidth 
                    onClick={handlePayment} 
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                     {isProcessing ? t('bill.modal.processing') : t('bill.modal.confirm')}
                  </Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default Settings;
