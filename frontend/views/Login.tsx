
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { authService } from '../api/services/auth';
import { ChefHat, Lock, Phone, Globe, CheckCircle2 } from 'lucide-react';

const Login: React.FC = () => {
  const showDemoCredentials = import.meta.env.DEV;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  // Заявка на сброс пароля
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await authService.requestPasswordReset(resetPhone, resetNote);
      setResetDone(true);
    } catch {
      setResetError(t('reset.error'));
    } finally {
      setResetLoading(false);
    }
  };

  const closeReset = () => {
    setResetOpen(false);
    setResetDone(false);
    setResetPhone('');
    setResetNote('');
    setResetError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError(t('auth.error'));
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = () => {
    if (language === 'en') setLanguage('ru');
    else if (language === 'ru') setLanguage('uz');
    else setLanguage('en');
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
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-[var(--bg-surface)] mb-4 shadow-lg">
            <ChefHat size={32} />
          </div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">{t('auth.welcome')}</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label={t('auth.phone')}
            type="tel"
            inputMode="tel"
            autoComplete="username"
            icon={<Phone size={18} />}
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="+998 90 123 45 67"
          />
          <div>
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              icon={<Lock size={18} />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="mt-2 text-xs font-semibold text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
            >
              {t('reset.forgot')}
            </button>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth size="md" disabled={isLoading}>
            {isLoading ? '...' : t('auth.signin')}
          </Button>
        </form>

        <Modal isOpen={resetOpen} onClose={closeReset} title={t('reset.title')}>
          {resetDone ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={26} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t('reset.done_title')}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t('reset.done_text')}</p>
              <Button onClick={closeReset} fullWidth>{t('reset.close')}</Button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">{t('reset.desc')}</p>
              <Input
                label={t('auth.phone')}
                type="tel"
                inputMode="tel"
                icon={<Phone size={18} />}
                value={resetPhone}
                onChange={e => setResetPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                required
              />
              <Input
                label={t('reset.note')}
                value={resetNote}
                onChange={e => setResetNote(e.target.value)}
                placeholder={t('reset.note_ph')}
              />
              {resetError && (
                <div role="alert" className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
                  {resetError}
                </div>
              )}
              <Button type="submit" fullWidth disabled={resetLoading || !resetPhone}>
                {resetLoading ? '...' : t('reset.submit')}
              </Button>
            </form>
          )}
        </Modal>

        <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {t('register.no_account')}{' '}
          <Link to="/register" className="font-bold text-[var(--text-primary)] underline">
            {t('register.title')}
          </Link>
        </div>

        {showDemoCredentials && (
          <div className="mt-8 text-center border-t border-[var(--border-light)] pt-6">
            <p className="text-xs text-[var(--text-muted)] mb-2 font-bold uppercase tracking-wider">{t('login.demo_creds')}</p>
            <div className="text-xs text-left bg-[var(--bg-surface-2)] p-3 rounded-lg border border-[var(--border-light)]">
                <div className="flex justify-between items-center mb-1">
                   <span className="font-bold text-[var(--text-primary)]">{t('login.client_admin')}</span>
                   <span className="text-[10px] text-[var(--text-muted)] uppercase">Tenant 1</span>
                </div>
                <div className="font-mono text-[var(--text-secondary)]">admin / admin123</div>

                <div className="flex justify-between items-center mt-2 mb-1">
                   <span className="font-bold text-[var(--text-primary)]">{t('login.client_admin')}</span>
                   <span className="flex items-center gap-2">
                     <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">{t('login.access_limited')}</span>
                     <span className="text-[10px] text-[var(--text-muted)] uppercase">Tenant 2</span>
                   </span>
                </div>
                <div className="font-mono text-[var(--text-secondary)]">oqtepa / admin123</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
