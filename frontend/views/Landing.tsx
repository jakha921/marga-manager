import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  ChefHat,
  ClipboardList,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../context/LanguageContext';

// Реальные контакты и отзывы: секции скрыты, пока значения пустые.
// Заполните перед продакшеном — выдуманные отзывы и контакты публиковать нельзя.
const CONTACTS = { telegram: '', phone: '', email: '' };
const TESTIMONIALS: { name: string; role: string; text: string }[] = [];
// Корпоративный тариф «по запросу»: впишите реальный контакт (Telegram/тел./email).
// Пока пусто — строка «Свяжитесь» не показывается.
const ENTERPRISE_CONTACT = '';

const LANGS: Language[] = ['uz', 'ru', 'en'];

// Палитра «журнал учёта»: бумага, чернила, шариковая ручка, красное поле
const INK = '#1C2433';
const PEN = '#2B44C4';
const RED = '#C43B2E';
const PAPER = '#FBFBF8';
const MUTED = '#66707F';
const RULE = '#E4E7EE';

const Landing: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const metrics = [
    [t('landing.metric.margin'), t('landing.metric.margin.value')],
    [t('landing.metric.sales'), t('landing.metric.sales.value')],
    [t('landing.metric.stock'), t('landing.metric.stock.value')],
  ];

  const snapshotRows = [
    [t('landing.row.margin'), t('landing.row.margin.value')],
    [t('landing.row.dynamics'), t('landing.row.dynamics.value')],
    [t('landing.row.stock'), t('landing.row.stock.value')],
    [t('landing.row.expense'), t('landing.row.expense.value')],
    [t('landing.row.departments'), t('landing.row.departments.value')],
  ];

  const painItems = [1, 2, 3].map(i => ({
    before: t(`landing.pain.${i}.before`),
    after: t(`landing.pain.${i}.after`),
  }));

  const modules = [
    { icon: ClipboardList, title: t('landing.module.input.title'), text: t('landing.module.input.text') },
    { icon: ShieldCheck, title: t('landing.module.rules.title'), text: t('landing.module.rules.text') },
    { icon: Building2, title: t('landing.module.branches.title'), text: t('landing.module.branches.text') },
    { icon: CreditCard, title: t('landing.module.saas.title'), text: t('landing.module.saas.text') },
  ];

  const steps = [1, 2, 3].map(i => ({
    title: t(`landing.steps.${i}.title`),
    text: t(`landing.steps.${i}.text`),
  }));

  const trustItems = [
    t('landing.price.trial'),
    t('landing.footer.roles'),
    t('landing.footer.devices'),
    t('landing.saas.item.tenancy'),
  ];

  const pricingPlans = [
    {
      name: t('landing.price.basic'),
      price: '299 000',
      note: t('landing.price.basic.note'),
      features: [1, 2, 3, 4].map(i => t(`landing.price.basic.f${i}`)),
      popular: false,
    },
    {
      name: t('landing.price.pro'),
      price: '589 000',
      note: t('landing.price.pro.note'),
      features: [1, 2, 3, 4].map(i => t(`landing.price.pro.f${i}`)),
      popular: true,
    },
  ];

  const faqItems = [1, 2, 3, 4].map(i => ({
    q: t(`landing.faq.q${i}`),
    a: t(`landing.faq.a${i}`),
  }));

  const hasContacts = CONTACTS.telegram || CONTACTS.phone || CONTACTS.email;

  const primaryCta =
    'mg-body inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white transition-colors';

  const eyebrow = (text: string) => (
    <div className="mg-mono mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: MUTED }}>
      {text}
    </div>
  );

  return (
    <main className="mg-body min-h-screen" style={{ backgroundColor: PAPER, color: INK }}>
      <header className="border-b" style={{ borderColor: RULE }}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: INK }}>
              <ChefHat size={22} />
            </div>
            <div className="mg-display hidden text-sm font-semibold leading-tight sm:block">
              MARGA
              <span className="block text-[9px] font-medium tracking-[0.3em]" style={{ color: MUTED }}>
                MANAGER
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-7 md:flex">
            {[
              [t('landing.nav.features'), 'capabilities'],
              [t('landing.nav.pricing'), 'pricing'],
            ].map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: MUTED }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="mg-mono flex overflow-hidden rounded-lg border text-[11px] font-semibold uppercase" style={{ borderColor: RULE }}>
              {LANGS.map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className="min-h-[36px] px-2.5 transition-colors"
                  style={language === lang ? { backgroundColor: INK, color: '#fff' } : { color: MUTED }}
                >
                  {lang}
                </button>
              ))}
            </div>
            <Link
              to="/login"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-4 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ borderColor: INK, color: INK }}
            >
              {t('landing.login')}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:pt-16">
        <div className="max-w-xl">
          <div
            className="mg-mono mb-6 inline-block -rotate-1 rounded border-[1.5px] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ borderColor: PEN, color: PEN }}
          >
            {t('landing.badge')}
          </div>
          <h1 className="mg-display text-[26px] font-semibold leading-[1.2] sm:text-4xl lg:text-[42px] lg:leading-[1.18]">
            {t('landing.hero.title')}
          </h1>
          <p className="mt-6 text-base leading-7" style={{ color: MUTED }}>
            {t('landing.hero.subtitle')}
          </p>
          <p className="mt-3 text-sm leading-6" style={{ color: MUTED }}>
            {t('landing.hero.audience')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className={primaryCta}
              style={{ backgroundColor: PEN }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#21349B')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = PEN)}
            >
              {t('landing.cta.open')}
              <ArrowRight size={17} />
            </Link>
            <button
              type="button"
              onClick={() => scrollTo('capabilities')}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ borderColor: INK, color: INK }}
            >
              {t('landing.cta.inside')}
            </button>
          </div>
          <p className="mg-mono mt-4 text-xs" style={{ color: MUTED }}>
            {t('landing.cta.note')}
          </p>
        </div>

        {/* Подпись страницы: дашборд как страница журнала учёта */}
        <div className="rounded-xl border bg-white shadow-[0_2px_16px_rgba(28,36,51,0.07)]" style={{ borderColor: RULE }}>
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: RULE }}>
            <div>
              <div className="mg-display text-sm font-semibold">{t('landing.snapshot.title')}</div>
              <div className="mt-0.5 text-xs" style={{ color: MUTED }}>{t('landing.snapshot.subtitle')}</div>
            </div>
            <div
              className="mg-mono rotate-2 rounded border-[1.5px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ borderColor: PEN, color: PEN }}
            >
              {t('landing.snapshot.status')}
            </div>
          </div>

          <div className="grid divide-x border-b sm:grid-cols-3" style={{ borderColor: RULE }}>
            {metrics.map(([label, value]) => (
              <div key={label} className="px-5 py-4" style={{ borderColor: RULE }}>
                <div className="mg-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                  {label}
                </div>
                <div className="mg-mono mt-1.5 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="mg-ledger-rules mg-ledger-margin rounded-b-xl py-2 pl-12 pr-5">
            {snapshotRows.map(([name, value]) => (
              <div key={name} className="flex h-[56px] items-end gap-2 pb-[7px]">
                <span className="text-sm font-medium leading-none">{name}</span>
                <span className="mb-[3px] flex-1 border-b border-dotted" style={{ borderColor: '#B4BCCB' }} />
                <span className="mg-mono text-sm font-semibold leading-none">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t" style={{ borderColor: RULE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
          <h2 className="mg-display max-w-2xl text-xl font-semibold leading-snug sm:text-2xl">
            {t('landing.pain.title')}
          </h2>
          <div
            className="mt-7 grid overflow-hidden rounded-xl border md:grid-cols-2"
            style={{ borderColor: RULE }}
          >
            {/* «До»: страница тетради с зачёркнутыми красной ручкой записями */}
            <div className="mg-ledger-rules mg-ledger-margin border-b py-5 pl-12 pr-6 md:border-b-0 md:border-r" style={{ borderColor: RULE, backgroundColor: '#FFFFFF' }}>
              <div className="mg-mono mb-4 inline-block -rotate-1 rounded border-[1.5px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ borderColor: RED, color: RED }}>
                {t('landing.pain.before.label')}
              </div>
              {painItems.map(item => (
                <p
                  key={item.before}
                  className="flex h-[56px] items-center text-[15px] font-medium leading-snug line-through decoration-[1.5px]"
                  style={{ color: RED, textDecorationColor: RED }}
                >
                  {item.before}
                </p>
              ))}
            </div>
            {/* «После»: чистая цифровая страница */}
            <div className="py-5 pl-6 pr-6 sm:pl-8" style={{ backgroundColor: '#F6F8FE' }}>
              <div className="mg-mono mb-4 inline-block rotate-1 rounded border-[1.5px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ borderColor: PEN, color: PEN }}>
                {t('landing.pain.after.label')}
              </div>
              {painItems.map(item => (
                <p key={item.after} className="flex h-[56px] items-center gap-3 text-[15px] font-semibold leading-snug">
                  <Check size={18} className="shrink-0" style={{ color: PEN }} />
                  {item.after}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-t" style={{ borderColor: RULE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          {eyebrow(t('landing.nav.features'))}
          <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {modules.map(module => {
              const Icon = module.icon;
              return (
                <div key={module.title} className="border-t pt-5" style={{ borderColor: RULE }}>
                  <div className="flex items-center gap-3">
                    <Icon size={19} style={{ color: PEN }} />
                    <h3 className="mg-display text-base font-semibold">{module.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6" style={{ color: MUTED }}>{module.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t" style={{ borderColor: RULE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          {eyebrow(t('landing.roles.title'))}
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
            {[
              [t('landing.role.admin.title'), t('landing.role.admin')],
              [t('landing.role.kitchen.title'), t('landing.role.kitchen')],
              [t('landing.role.super.title'), t('landing.role.super')],
            ].map(([title, text]) => (
              <div key={title} className="border-t pt-5" style={{ borderColor: RULE }}>
                <div className="mg-display text-base font-semibold">{title}</div>
                <p className="mt-2 text-sm leading-6" style={{ color: MUTED }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t" style={{ borderColor: RULE, backgroundColor: '#F4F5F2' }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          {eyebrow(t('landing.steps.title'))}
          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title}>
                <div
                  className="mg-mono flex h-9 w-9 items-center justify-center rounded border-[1.5px] text-sm font-semibold"
                  style={{ borderColor: INK }}
                >
                  {index + 1}
                </div>
                <div className="mg-display mt-4 text-base font-semibold">{step.title}</div>
                <p className="mt-2 text-sm leading-6" style={{ color: MUTED }}>{step.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-2.5">
            {trustItems.map((item, index) => (
              <span
                key={item}
                className={`mg-mono inline-block rounded border-[1.5px] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                  index % 2 ? 'rotate-1' : '-rotate-1'
                }`}
                style={{ borderColor: INK, color: INK }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {TESTIMONIALS.length > 0 && (
        <section className="border-t" style={{ borderColor: RULE }}>
          <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
            {eyebrow(t('landing.testimonials.title'))}
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
              {TESTIMONIALS.map(item => (
                <figure key={item.name} className="border-t pt-5" style={{ borderColor: RULE }}>
                  <blockquote className="text-sm leading-6" style={{ color: MUTED }}>«{item.text}»</blockquote>
                  <figcaption className="mt-3">
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="mg-mono text-xs" style={{ color: MUTED }}>{item.role}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="pricing" className="border-t" style={{ borderColor: RULE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          {eyebrow(t('landing.pricing.title'))}
          <p className="text-sm" style={{ color: MUTED }}>{t('landing.pricing.subtitle')}</p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
            {pricingPlans.map(plan => (
              <div
                key={plan.name}
                className="relative rounded-xl border bg-white p-6"
                style={plan.popular ? { borderColor: PEN, borderWidth: 2 } : { borderColor: RULE }}
              >
                {plan.popular && (
                  <span
                    className="mg-mono absolute -top-3 right-5 -rotate-2 rounded border-[1.5px] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ borderColor: PEN, color: PEN }}
                  >
                    {t('landing.price.popular')}
                  </span>
                )}
                <div className="mg-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                  {plan.name}
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="mg-mono text-3xl font-semibold">{plan.price}</span>
                  <span className="mg-mono text-sm font-medium" style={{ color: MUTED }}>
                    UZS{t('landing.price.period')}
                  </span>
                </div>
                <div className="mt-1 text-xs" style={{ color: MUTED }}>{plan.note}</div>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm leading-6">
                      <Check size={16} className="mt-1 shrink-0" style={{ color: PEN }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`${primaryCta} mt-6 w-full`}
                  style={{ backgroundColor: plan.popular ? PEN : INK }}
                >
                  {t('landing.cta.open')}
                </Link>
              </div>
            ))}
          </div>
          <p className="mg-mono mt-4 text-xs" style={{ color: MUTED }}>{t('landing.cta.note')}</p>
          {ENTERPRISE_CONTACT && (
            <p className="mt-3 text-sm" style={{ color: MUTED }}>
              {t('landing.enterprise.note')}{' '}
              <a
                href={ENTERPRISE_CONTACT.startsWith('http') ? ENTERPRISE_CONTACT : `tel:${ENTERPRISE_CONTACT.replace(/\s/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
                style={{ color: PEN }}
              >
                {t('landing.enterprise.cta')}
              </a>
            </p>
          )}
        </div>
      </section>

      <section className="border-t" style={{ borderColor: RULE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          {eyebrow(t('landing.faq.title'))}
          <div className="max-w-3xl">
            {faqItems.map(item => (
              <details key={item.q} className="group border-b" style={{ borderColor: RULE }}>
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ArrowRight size={16} className="shrink-0 transition-transform group-open:rotate-90" style={{ color: MUTED }} />
                </summary>
                <p className="pb-5 text-sm leading-6" style={{ color: MUTED }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: INK }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="mg-display text-xl font-semibold text-white sm:text-2xl">{t('landing.footer.title')}</h2>
            <p className="mt-2 max-w-lg text-sm leading-6" style={{ color: '#9AA3B5' }}>{t('landing.footer.text')}</p>
            {hasContacts && (
              <div className="mg-mono mt-4 flex flex-wrap gap-5 text-sm font-medium" style={{ color: '#9AA3B5' }}>
                {CONTACTS.telegram && (
                  <a href={CONTACTS.telegram} target="_blank" rel="noreferrer" className="hover:text-white">
                    Telegram
                  </a>
                )}
                {CONTACTS.phone && (
                  <a href={`tel:${CONTACTS.phone.replace(/\s/g, '')}`} className="hover:text-white">
                    {CONTACTS.phone}
                  </a>
                )}
                {CONTACTS.email && (
                  <a href={`mailto:${CONTACTS.email}`} className="hover:text-white">
                    {CONTACTS.email}
                  </a>
                )}
              </div>
            )}
          </div>
          <Link
            to="/register"
            className="mg-body inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ color: INK }}
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
