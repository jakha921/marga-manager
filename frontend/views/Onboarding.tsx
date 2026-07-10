import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChefHat } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

const Onboarding: React.FC = () => {
  const { addKitchen } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState(t('onboarding.branch_default'));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setIsLoading(true);
    const result = await addKitchen({ name: name.trim(), isActive: true });
    setIsLoading(false);
    if (result.success) navigate('/');
    else setError(result.error || t('onboarding.error'));
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
      <div className="max-w-lg w-full bg-[var(--bg-surface)] rounded-3xl shadow-card border border-[var(--border-light)] p-8">
        <div className="mb-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-lg">
            <ChefHat size={30} />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">{t('onboarding.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{t('onboarding.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t('onboarding.branch')}
            icon={<Building2 size={18} />}
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}
          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? '...' : t('onboarding.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
