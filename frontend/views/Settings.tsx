
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
  Building2,
  DollarSign,
  Package,
  Save
} from 'lucide-react';
import { User as UserType, SubscriptionPlan, Organization } from '../types';
import type { PlanConfig, SubscriptionOrder } from '../types';
import { paymentsService } from '../api/services/payments';
import { PLAN_LIMITS } from '../constants';

type Tab = 'general' | 'users' | 'billing';

const Settings: React.FC = () => {
  const { t } = useLanguage();
  const { users, addUser, updateUser, deleteUser, currentOrganization, updateOrganization } = useData();
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
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [paymentOrders, setPaymentOrders] = useState<SubscriptionOrder[]>([]);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Filter users for current tenant organization
  const tenantUsers = users.filter(u => u.organizationId === currentOrganization?.id);
  const maxUsers = currentOrganization?.maxUsers || 5;
  const canAddUser = tenantUsers.length < maxUsers;

  useEffect(() => {
    if (currentOrganization && activeTab === 'general') {
      setGenForm({ ...currentOrganization });
    }
  }, [currentOrganization, activeTab]);

  useEffect(() => {
    if (activeTab === 'billing') {
      paymentsService.getOrders().then(res => {
        setPaymentOrders(res.data.results || []);
      }).catch(() => {});
      paymentsService.getPlans().then(res => {
        setPlanConfigs(Array.isArray(res.data) ? res.data : []);
      }).catch(() => {});
    }
  }, [activeTab]);

  const PLANS: { id: SubscriptionPlan; name: string; features: string[] }[] = [
    {
      id: 'BASIC',
      name: t('saas.plan.basic'),
      features: [
        `${t('bill.feature.kitchens')}: ${PLAN_LIMITS.BASIC.kitchens}`,
        `${t('bill.feature.users')}: ${PLAN_LIMITS.BASIC.users}`,
        t('bill.feature.dailyReports'),
      ],
    },
    {
      id: 'PRO',
      name: t('saas.plan.pro'),
      features: [
        `${t('bill.feature.kitchens')}: ${PLAN_LIMITS.PRO.kitchens}`,
        `${t('bill.feature.users')}: ${PLAN_LIMITS.PRO.users}`,
        t('bill.feature.analytics'),
        t('bill.feature.support'),
      ],
    },
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

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setIsCreatingOrder(true);
    setBillingError(null);
    try {
      const config = planConfigs.find(c => c.plan === plan);
      const amount = config?.price ?? 0;
      const orderRes = await paymentsService.createOrder({ targetPlan: plan, amount });
      const urlRes = await paymentsService.getCheckoutUrl(orderRes.data.id);
      const { method, url, fields } = urlRes.data;
      if (method === 'POST' && fields) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;
        for (const { name, value } of fields) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        window.location.href = url;
      }
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string; targetPlan?: string[]; amount?: string[] } } };
      const msg =
        axErr.response?.data?.detail ??
        axErr.response?.data?.targetPlan?.[0] ??
        axErr.response?.data?.amount?.[0] ??
        (err instanceof Error ? err.message : 'Ошибка при создании заказа');
      setBillingError(msg);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePayPendingOrder = async (orderId: number) => {
    setIsCreatingOrder(true);
    setBillingError(null);
    try {
      const urlRes = await paymentsService.getCheckoutUrl(orderId);
      const { method, url, fields } = urlRes.data;
      if (method === 'POST' && fields) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;
        for (const { name, value } of fields) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        window.location.href = url;
      }
    } catch {
      setBillingError(t('bill.error') || 'Ошибка при открытии оплаты');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const currentUser = tenantUsers.find(u => u.username === username);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-card border border-[var(--border-light)] p-2 overflow-hidden">
           <button 
             onClick={() => setActiveTab('general')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'general' ? 'bg-[var(--color-primary)] text-[var(--bg-surface)] shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]'}`}
           >
              <SettingsIcon size={18} /> {t('set.tab.general')}
           </button>
           <button 
             onClick={() => setActiveTab('users')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-[var(--color-primary)] text-[var(--bg-surface)] shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]'}`}
           >
              <Users size={18} /> {t('set.tab.users')}
           </button>
           <button 
             onClick={() => setActiveTab('billing')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'billing' ? 'bg-[var(--color-primary)] text-[var(--bg-surface)] shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]'}`}
           >
              <CreditCard size={18} /> {t('set.tab.billing')}
           </button>
        </div>

        {/* Plan Summary Mini Card */}
        <div className="mt-6 bg-[var(--color-primary)] rounded-2xl p-5 text-[var(--bg-surface)] shadow-xl shadow-[var(--color-primary)]/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="relative z-10">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Current Plan</h4>
              <div className="flex items-center gap-2 mb-4">
                 <Crown size={18} className="text-emerald-400" />
                 <span className="font-display font-bold text-lg">{currentOrganization?.plan}</span>
              </div>
              <div className="space-y-2">
                 <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                       <span>Users</span>
                       <span>{tenantUsers.length} / {maxUsers}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(tenantUsers.length / maxUsers) * 100}%` }}></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[var(--bg-surface)] rounded-3xl shadow-card border border-[var(--border-light)] p-6 lg:p-8 overflow-y-auto">
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div>
                    <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">{t('set.tab.users')}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{t('set.users.desc')}</p>
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
                    <div key={user.id} className="group p-5 rounded-2xl border border-[var(--border-light)] hover:border-[var(--border-color)] hover:shadow-lg hover:shadow-slate-900/5 transition-all bg-[var(--bg-surface-2)]/50 hover:bg-[var(--bg-surface)] flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm ${user.role === 'TENANT_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
                             {user.fullName.charAt(0)}
                          </div>
                          <div>
                             <h4 className="font-bold text-[var(--text-primary)]">{user.fullName}</h4>
                             <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mt-0.5">
                                <span className="font-mono">@{user.username}</span>
                                <span className="w-1 h-1 rounded-full bg-[var(--border-color)]"></span>
                                <span className={user.role === 'TENANT_ADMIN' ? 'text-purple-600' : 'text-[var(--text-secondary)]'}>
                                   {user.role === 'TENANT_ADMIN' ? t('set.users.role.admin') : t('set.users.role.kitchen')}
                                </span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                             onClick={() => handleOpenEdit(user)}
                             className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-light)] hover:border-[var(--border-color)] transition-all"
                          >
                             <Edit2 size={16} />
                          </button>
                          {/* Prevent deleting yourself */}
                          {currentUser?.id !== user.id && (
                             <button 
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-[var(--text-muted)] hover:text-red-600 bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-light)] hover:border-red-200 transition-all"
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
                       className="p-5 rounded-2xl border border-dashed border-[var(--border-color)] hover:border-slate-400 hover:bg-[var(--bg-surface-2)] transition-all flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] h-full min-h-[100px]"
                    >
                       <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center">
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
            <div>
              <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">{t('set.tab.billing')}</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{t('set.billing.desc')}</p>
              <p className="text-sm text-emerald-700 font-bold mt-2">{t('set.billing.trial')}</p>
            </div>

            {billingError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100">
                <AlertTriangle size={16} /> {billingError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PLANS.map(plan => {
                const isCurrent = currentOrganization?.plan === plan.id;
                const isPro = plan.id === 'PRO';
                const currentPlanIndex = ['BASIC', 'PRO'].indexOf(currentOrganization?.plan || 'BASIC');
                const thisPlanIndex = ['BASIC', 'PRO'].indexOf(plan.id);
                const isUpgrade = thisPlanIndex > currentPlanIndex;
                const planConfig = planConfigs.find(c => c.plan === plan.id);
                const priceDisplay = planConfig
                  ? `${String(planConfig.priceUzs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} UZS`
                  : '...';

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col p-6 rounded-3xl border transition-all duration-300 ${
                      isCurrent
                        ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-[var(--bg-surface)] shadow-lg'
                        : 'border-[var(--border-light)] bg-[var(--bg-surface-2)]/50 hover:bg-[var(--bg-surface)] hover:border-[var(--border-color)] hover:shadow-md'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-sm tracking-wider">
                        {t('bill.current')}
                      </div>
                    )}
                    {isPro && !isCurrent && (
                      <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl rounded-tr-2xl tracking-wider">
                        {t('set.billing.recommended')}
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-[var(--text-primary)] font-display mb-2">{plan.name}</h3>
                    <div className="mb-6">
                      <span className="text-3xl font-bold text-[var(--text-primary)]">{priceDisplay}</span>
                      {planConfig && planConfig.price > 0 && (
                        <span className="text-sm text-[var(--text-muted)] font-medium">{t('bill.cycle')}</span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                          <CheckCircle2
                            size={16}
                            className={`flex-shrink-0 mt-0.5 ${isCurrent ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}
                          />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      fullWidth
                      variant={isCurrent ? 'secondary' : 'primary'}
                      disabled={isCreatingOrder || !planConfig}
                      onClick={() => handleUpgrade(plan.id)}
                      className={isCurrent ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : ''}
                    >
                      {isCreatingOrder
                        ? '...'
                        : isCurrent
                          ? t('bill.btn.renew')
                          : isUpgrade
                            ? t('bill.btn.upgrade')
                            : t('bill.btn.downgrade')}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Payment History */}
            {paymentOrders.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-4">{t('set.billing.history')}</h3>
                <div className="rounded-2xl border border-[var(--border-light)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-light)]">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('set.billing.th_date')}</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('set.billing.th_plan')}</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('set.billing.th_amount')}</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('set.billing.th_status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paymentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-[var(--bg-surface-2)]/50">
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{order.targetPlan}</td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {(order.amount / 100).toLocaleString()} UZS
                          </td>
                          <td className="px-4 py-3">
                            {order.status === 'PENDING' || order.status === 'PAYING' ? (
                              <button
                                onClick={() => handlePayPendingOrder(order.id)}
                                disabled={isCreatingOrder}
                                title={t('bill.pay_now')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {order.status}
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  order.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {order.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
           <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                 <div>
                    <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">{t('set.gen.profile')}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Basic information about your establishment.</p>
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
              <div className="bg-[var(--bg-surface-2)] p-6 rounded-2xl border border-[var(--border-light)] space-y-6">
                 <div className="flex items-center gap-3 text-[var(--text-primary)] font-bold border-b border-[var(--border-color)] pb-2 mb-4">
                    <Building2 size={20} className="text-[var(--text-muted)]" />
                    {t('set.profile.identity')}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label={t('set.gen.org_name')} 
                      value={genForm.name || ''} 
                      onChange={e => setGenForm({...genForm, name: e.target.value})}
                      className="bg-[var(--bg-surface)]"
                    />
                    <Input 
                      label={t('set.gen.phone')} 
                      value={genForm.phone || ''} 
                      onChange={e => setGenForm({...genForm, phone: e.target.value})}
                      placeholder="+998 90 123 45 67"
                      className="bg-[var(--bg-surface)]"
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label={t('set.gen.email')} 
                      value={genForm.email || ''} 
                      onChange={e => setGenForm({...genForm, email: e.target.value})}
                      placeholder="info@restaurant.com"
                      className="bg-[var(--bg-surface)]"
                    />
                    <Input 
                      label={t('set.gen.address')} 
                      value={genForm.address || ''} 
                      onChange={e => setGenForm({...genForm, address: e.target.value})}
                      placeholder="Street, City"
                      className="bg-[var(--bg-surface)]"
                    />
                 </div>
              </div>

              {/* Section 2: Finance */}
              <div className="bg-[var(--bg-surface-2)] p-6 rounded-2xl border border-[var(--border-light)] space-y-6">
                 <div className="flex items-center gap-3 text-[var(--text-primary)] font-bold border-b border-[var(--border-color)] pb-2 mb-4">
                    <DollarSign size={20} className="text-[var(--text-muted)]" />
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
                       className="bg-[var(--bg-surface)]"
                    />
                    <Input 
                      label={t('set.gen.tax')} 
                      type="number"
                      value={genForm.taxRate || ''} 
                      onChange={e => setGenForm({...genForm, taxRate: Number(e.target.value)})}
                      placeholder="12"
                      className="bg-[var(--bg-surface)]"
                    />
                 </div>
              </div>

              {/* Section 3: Inventory */}
              <div className="bg-[var(--bg-surface-2)] p-6 rounded-2xl border border-[var(--border-light)] space-y-6">
                 <div className="flex items-center gap-3 text-[var(--text-primary)] font-bold border-b border-[var(--border-color)] pb-2 mb-4">
                    <Package size={20} className="text-[var(--text-muted)]" />
                    {t('set.gen.inventory')}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label={t('set.gen.low_stock')} 
                      type="number"
                      value={genForm.lowStockThreshold || ''} 
                      onChange={e => setGenForm({...genForm, lowStockThreshold: Number(e.target.value)})}
                      placeholder="10"
                      className="bg-[var(--bg-surface)]"
                    />
                    <div className="flex items-center text-xs text-[var(--text-secondary)] pt-6">
                       {t('set.threshold_help')}
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
               <label className="block font-display font-bold text-[11px] text-[var(--text-secondary)] mb-2 ml-1 uppercase tracking-wider">
                  {t('set.users.role')}
               </label>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                     onClick={() => setUserForm({...userForm, role: 'TENANT_ADMIN'})}
                     className={`p-3 rounded-xl border text-left transition-all ${userForm.role === 'TENANT_ADMIN' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-[var(--border-color)] hover:bg-[var(--bg-surface-2)]'}`}
                  >
                     <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">{t('set.users.role.admin')}</div>
                     <div className="text-[10px] text-[var(--text-secondary)] leading-tight">Full access to settings and reports</div>
                  </button>
                  <button
                     onClick={() => setUserForm({...userForm, role: 'KITCHEN_USER'})}
                     className={`p-3 rounded-xl border text-left transition-all ${userForm.role === 'KITCHEN_USER' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-[var(--border-color)] hover:bg-[var(--bg-surface-2)]'}`}
                  >
                     <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">{t('set.users.role.kitchen')}</div>
                     <div className="text-[10px] text-[var(--text-secondary)] leading-tight">Limited to Quick Input only</div>
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

    </div>
  );
};

export default Settings;
