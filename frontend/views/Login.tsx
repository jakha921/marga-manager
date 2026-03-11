
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
          <button 
              onClick={handleLanguageChange}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm border border-slate-200 hover:border-slate-300 transition-colors group"
            >
               <Globe size={16} className="text-slate-400 group-hover:text-slate-600" />
               <span className="text-xs font-bold text-slate-600 uppercase w-4 text-center">{language}</span>
            </button>
      </div>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-slate-900/20">
            <ChefHat size={32} />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900">{t('auth.welcome')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('auth.subtitle')}</p>
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

          <Button type="submit" fullWidth size="md" className="shadow-lg shadow-slate-900/20" disabled={isLoading}>
            {isLoading ? '...' : t('auth.signin')}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Demo Credentials</p>
          <div className="text-xs text-left bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                 <span className="font-bold text-slate-700">Client Admin</span>
                 <span className="text-[10px] text-slate-400 uppercase">Tenant 1</span>
              </div>
              <div className="font-mono text-slate-500">admin / admin123</div>
              
              <div className="flex justify-between items-center mt-2 mb-1">
                 <span className="font-bold text-slate-700">Client Admin</span>
                 <span className="text-[10px] text-slate-400 uppercase">Tenant 2</span>
              </div>
              <div className="font-mono text-slate-500">oqtepa / admin123</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
