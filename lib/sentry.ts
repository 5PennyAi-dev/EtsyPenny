import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry() {
  if (initialized || !process.env.VERCEL_ENV) return;
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.VERCEL_ENV,
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export { Sentry };
