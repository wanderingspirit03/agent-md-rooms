import { describe, expect, it } from 'vitest';
import { hostedPortFromEnv, publicOriginFromProviderEnv, resolvePublicOrigin } from './public-origin.js';

describe('deployment public origin resolution', () => {
  it('prefers explicit URLs over environment defaults', () => {
    expect(resolvePublicOrigin({
      appUrl: 'https://app.example.test',
      syncUrl: 'https://sync.example.test',
      defaultUrl: 'http://localhost:8787',
      env: {
        FOLD_PUBLIC_URL: 'https://env.example.test',
      },
    })).toEqual({
      appUrl: 'https://app.example.test',
      syncUrl: 'https://sync.example.test',
      source: 'explicit',
    });
  });

  it('uses the same public URL for same-origin hosted deployments', () => {
    expect(resolvePublicOrigin({
      defaultUrl: 'http://localhost:8787',
      env: {
        FOLD_PUBLIC_URL: 'https://fold.example.test',
      },
    })).toEqual({
      appUrl: 'https://fold.example.test',
      syncUrl: 'https://fold.example.test',
      source: 'environment',
    });
  });

  it('detects common hosting provider public origins', () => {
    expect(publicOriginFromProviderEnv({ RAILWAY_PUBLIC_DOMAIN: 'fold.up.railway.app' })).toBe('https://fold.up.railway.app');
    expect(publicOriginFromProviderEnv({ RENDER_EXTERNAL_URL: 'https://fold.onrender.com' })).toBe('https://fold.onrender.com');
    expect(publicOriginFromProviderEnv({ VERCEL_URL: 'fold.vercel.app' })).toBe('https://fold.vercel.app');
    expect(publicOriginFromProviderEnv({ FLY_APP_NAME: 'fold-demo' })).toBe('https://fold-demo.fly.dev');
  });

  it('reads hosted platform ports from PORT', () => {
    expect(hostedPortFromEnv({ PORT: '4173' })).toBe(4173);
    expect(hostedPortFromEnv({}, 3000)).toBe(3000);
    expect(() => hostedPortFromEnv({ PORT: 'not-a-port' })).toThrow(/Invalid PORT/);
  });
});
