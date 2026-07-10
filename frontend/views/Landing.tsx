import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChefHat,
  ClipboardList,
  Users,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Landing: React.FC = () => {
  const { t } = useLanguage();

  const inputModule = {
    icon: ClipboardList,
    title: t('landing.module.input.title'),
    text: t('landing.module.input.text'),
  };
  const InputIcon = inputModule.icon;

  const metrics = [
    [t('landing.metric.margin'), t('landing.metric.margin.value')],
    [t('landing.metric.sales'), t('landing.metric.sales.value')],
    [t('landing.metric.stock'), t('landing.metric.stock.value')],
  ];

  const snapshotRows = [
    [t('landing.row.margin'), t('landing.row.margin.value'), 88],
    [t('landing.row.dynamics'), t('landing.row.dynamics.value'), 78],
    [t('landing.row.stock'), t('landing.row.stock.value'), 72],
    [t('landing.row.expense'), t('landing.row.expense.value'), 64],
    [t('landing.row.departments'), t('landing.row.departments.value'), 58],
  ];

  const quickItems = [
    [t('landing.quick.incoming'), t('landing.quick.incoming.text')],
    [t('landing.quick.stock'), t('landing.quick.stock.text')],
    [t('landing.quick.sales'), t('landing.quick.sales.text')],
  ];

  const pricingPlans = [
    [t('landing.price.basic'), '299 000 UZS', t('landing.price.basic.note')],
    [t('landing.price.pro'), '589 000 UZS', t('landing.price.pro.note')],
  ];

  const scrollToCapabilities = () => {
    document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-body">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-slate-900/10">
            <ChefHat size={24} />
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-none">MARGA</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase text-[var(--text-muted)]">MANAGER</div>
          </div>
        </div>

        <Link
          to="/login"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
        >
          {t('landing.login')}
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-10 pt-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:pb-12 lg:pt-14">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase text-emerald-700">
            <Users size={14} />
            {t('landing.badge')}
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            {t('landing.hero.title')}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            {t('landing.hero.subtitle')}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            {t('landing.hero.audience')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-transform active:scale-[0.98]"
            >
              {t('landing.cta.open')}
              <ArrowRight size={17} />
            </Link>
            <button
              type="button"
              onClick={scrollToCapabilities}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-6 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--text-primary)]"
            >
              {t('landing.cta.inside')}
            </button>
          </div>
          <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
            {pricingPlans.map(([name, price, note]) => (
              <div key={name} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] px-4 py-3 shadow-sm">
                <div className="text-xs font-bold uppercase text-[var(--text-muted)]">{name}</div>
                <div className="mt-1 font-display text-xl font-bold">{price}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{note}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {t('landing.price.trial')}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-surface)] p-3 shadow-card">
          <div className="rounded-2xl bg-[var(--bg-primary)] p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg font-bold">{t('landing.snapshot.title')}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{t('landing.snapshot.subtitle')}</div>
              </div>
              <div className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">{t('landing.snapshot.status')}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-xs font-bold uppercase text-[var(--text-muted)]">{label}</div>
                  <div className="mt-2 font-display text-2xl font-bold">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
              {snapshotRows.map(([name, value, progress]) => (
                <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0">
                  <div>
                    <div className="text-sm font-bold">{name}</div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold text-[var(--text-secondary)]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8 lg:pb-12">
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] p-6 shadow-card">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-surface-2)] text-[var(--text-primary)]">
              <InputIcon size={21} />
            </div>
            <h2 className="font-display text-xl font-bold">{inputModule.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{inputModule.text}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {quickItems.map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] p-5 shadow-sm">
                <div className="font-display text-lg font-bold">{title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">{t('landing.footer.title')}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('landing.footer.text')}</p>
          </div>
          <Link
            to="/register"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white"
          >
            {t('landing.cta.open')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Landing;
