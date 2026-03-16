import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import React from 'react';

export type LocaleMessages = Record<string, string | Record<string, string>>;

export interface I18nConfig {
  locale: string;
  fallbackLocale?: string;
  messages: Record<string, LocaleMessages>;
}

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLocales: string[];
}

const I18nCtx = createContext<I18nContextValue | null>(null);

function resolve(messages: LocaleMessages, key: string): string | undefined {
  const parts = key.split('.');
  let current: any = messages;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{{${key}}}`
  );
}

export function I18nProvider({ config, children }: { config: I18nConfig; children: React.ReactNode }) {
  const [locale, setLocale] = useState(config.locale);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const msgs = config.messages[locale] ?? config.messages[config.fallbackLocale ?? 'en'] ?? {};
    let text = resolve(msgs, key);

    if (text === undefined && config.fallbackLocale && locale !== config.fallbackLocale) {
      const fallback = config.messages[config.fallbackLocale] ?? {};
      text = resolve(fallback, key);
    }

    if (text === undefined) return key;
    return params ? interpolate(text, params) : text;
  }, [locale, config]);

  const availableLocales = useMemo(() => Object.keys(config.messages), [config.messages]);

  const value: I18nContextValue = useMemo(() => ({
    locale, setLocale, t, availableLocales,
  }), [locale, t, availableLocales]);

  return React.createElement(I18nCtx.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
