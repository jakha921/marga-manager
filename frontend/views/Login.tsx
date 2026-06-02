
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { ChefHat, Lock, User, Globe } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

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
            label={t('auth.username')}
            icon={<User size={18} />}
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="admin"
          />
          <Input
            label={t('auth.password')}
            type="password"
            icon={<Lock size={18} />}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth size="md" disabled={isLoading}>
            {isLoading ? '...' : t('auth.signin')}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-[var(--border-light)] pt-6">
          <p className="text-xs text-[var(--text-muted)] mb-2 font-bold uppercase tracking-wider">Demo Credentials</p>
          <div className="text-xs text-left bg-[var(--bg-surface-2)] p-3 rounded-lg border border-[var(--border-light)]">
              <div className="flex justify-between items-center mb-1">
                 <span className="font-bold text-[var(--text-primary)]">Client Admin</span>
                 <span className="text-[10px] text-[var(--text-muted)] uppercase">Tenant 1</span>
              </div>
              <div className="font-mono text-[var(--text-secondary)]">admin / admin123</div>

              <div className="flex justify-between items-center mt-2 mb-1">
                 <span className="font-bold text-[var(--text-primary)]">Client Admin</span>
                 <span className="text-[10px] text-[var(--text-muted)] uppercase">Tenant 2</span>
              </div>
              <div className="font-mono text-[var(--text-secondary)]">oqtepa / admin123</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
