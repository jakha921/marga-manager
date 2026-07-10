import React, { useEffect, useState } from 'react';
import { CreditCard, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Button from '../components/Button';
import type { PlanConfig, SubscriptionPlan } from '../types';
import { paymentsService } from '../api/services/payments';

const OrgSuspended: React.FC = () => {
  const { logout } = useAuth();
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsService.getPlans()
      .then(res => setPlans((Array.isArray(res.data) ? res.data : []).filter(p => p.plan !== 'ENTERPRISE')))
      .catch(() => setError(t('access.suspended.pay_error')));
  }, [language]);

  const handlePay = async (plan: PlanConfig) => {
    setError('');
    setLoadingPlan(plan.plan);
    try {
      const orderRes = await paymentsService.createOrder({ targetPlan: plan.plan, amount: plan.price });
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
    } catch {
      setError(t('access.suspended.pay_error'));
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--bg-surface)] rounded-3xl shadow-xl border border-[var(--border-light)] p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[var(--bg-surface)] shadow-lg">
          <ShieldAlert size={30} />
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          {t('access.suspended.title')}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t('access.suspended.text')}
        </p>

        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <CreditCard size={17} />
            {t('access.suspended.pay_title')}
          </div>
          {plans.map(plan => (
            <Button
              key={plan.plan}
              fullWidth
              disabled={loadingPlan !== null}
              onClick={() => handlePay(plan)}
            >
              {loadingPlan === plan.plan ? '...' : `${plan.plan} - ${plan.priceUzs.toLocaleString()} UZS`}
            </Button>
          ))}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-6 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          {t('access.suspended.logout')}
        </button>
      </div>
    </div>
  );
};

export default OrgSuspended;
