import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ChefHat, Globe, Lock, Phone, User } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Register: React.FC = () => {
  const { register } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLanguageChange = () => {
    if (language === 'en') setLanguage('ru');
    else if (language === 'ru') setLanguage('uz');
    else setLanguage('en');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const ok = await register({ organizationName, ownerName, phone, password });
    setIsLoading(false);
    if (ok) navigate('/onboarding');
    else setError(t('register.error'));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLanguageChange}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-full shadow-sm border border-[var(--border-color)] hover:border-[var(--border-color)] transition-colors group"
        >
          <Globe size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" />
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase w-4 text-center">{language}</span>
        </button>
      </div>

      <div className="max-w-md w-full bg-[var(--bg-surface)] rounded-3xl shadow-xl border border-[var(--border-light)] p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-[var(--bg-surface)] mb-4 shadow-lg">
            <ChefHat size={32} />
          </div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">{t('register.title')}</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t('register.organization')}
            icon={<Building2 size={18} />}
            value={organizationName}
            onChange={e => setOrganizationName(e.target.value)}
            required
          />
          <Input
            label={t('register.owner')}
            icon={<User size={18} />}
            value={ownerName}
            onChange={e => setOwnerName(e.target.value)}
            required
          />
          <Input
            label={t('register.phone')}
            type="tel"
            icon={<Phone size={18} />}
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            required
          />
          <Input
            label={t('auth.password')}
            type="password"
            icon={<Lock size={18} />}
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth size="md" disabled={isLoading}>
            {isLoading ? '...' : t('register.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {t('register.have_account')}{' '}
          <Link to="/login" className="font-bold text-[var(--text-primary)] underline">
            {t('landing.login')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
