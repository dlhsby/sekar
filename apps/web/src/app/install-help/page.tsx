'use client';

import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Share, Plus, Smartphone } from 'lucide-react';
import { SekarLogoBox } from '@/components/brand/SekarLogoBox';

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
  note?: string;
}

/**
 * iOS Safari install walkthrough
 *
 * Static page (no auth required). Shows step-by-step instructions for
 * adding SEKAR as a PWA on iOS Safari.
 */
export default function InstallHelpPage() {
  const { t } = useTranslation('install-help');

  const steps: Step[] = [
    {
      icon: Share,
      title: t('steps.0.title'),
      description: t('steps.0.description'),
      note: t('steps.0.note'),
    },
    {
      icon: Plus,
      title: t('steps.1.title'),
      description: t('steps.1.description'),
    },
    {
      icon: Smartphone,
      title: t('steps.2.title'),
      description: t('steps.2.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-nb-background px-4 py-8 max-w-lg mx-auto">
      {/* Back link */}
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-nb-body-sm font-semibold text-nb-black hover:underline mb-8"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('backLink')}
      </Link>

      {/* Header */}
      <div className="rounded-nb-md border-2 border-nb-black p-6 shadow-nb-sm bg-nb-sidebar mb-8">
        <div className="flex items-center gap-4">
          <SekarLogoBox size={56} className="shrink-0" />
          <div>
            <h1 className="text-nb-h2 font-bold text-white uppercase tracking-wide">
              {t('header.title')}
            </h1>
            <p className="text-nb-body-sm text-white/80 mt-1">
              {t('header.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="rounded-nb-base border-2 border-nb-black p-5 shadow-nb-sm bg-nb-white"
            >
              <div className="flex items-start gap-4">
                {/* Step number */}
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-nb-sm border-2 border-nb-black font-bold text-nb-h3 shrink-0 text-white"
                  style={{ background: 'var(--color-nb-sidebar-bg)' }}
                  aria-hidden="true"
                >
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-5 w-5 text-nb-black shrink-0" aria-hidden="true" />
                    <h2 className="text-nb-h3 font-bold text-nb-black uppercase tracking-wide">
                      {step.title}
                    </h2>
                  </div>
                  <p className="text-nb-body-sm text-nb-gray-700">{step.description}</p>
                  {step.note && (
                    <p className="mt-2 text-nb-caption text-nb-gray-500 italic">{step.note}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Footer note */}
      <div className="mt-8 rounded-nb-base border-2 border-nb-black p-4 bg-nb-warning/20">
        <p className="text-nb-body-sm text-nb-black">
          <strong>{t('footer.note')}</strong>
        </p>
      </div>

      {/* Android play store link */}
      <div className="mt-4 text-center">
        <p className="text-nb-caption text-nb-gray-500 mb-2">{t('footer.android')}</p>
        <a
          href="https://play.google.com/store/apps/details?id=id.go.dlhsurabaya.sekar"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-nb-base border-2 border-nb-black px-4 py-2 text-nb-caption font-bold uppercase text-nb-black bg-nb-primary shadow-nb-xs hover:shadow-nb-sm transition-shadow"
        >
          {t('footer.playStore')}
        </a>
      </div>
    </div>
  );
}
