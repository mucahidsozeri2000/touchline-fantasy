import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Ağ erişimi yasağı: çizimler asla tarayıcıdan çıkmamalı. Bu API'ler
 * kaynak kodda kullanılamaz (tests/no-network.test.ts de aynı kuralı denetler).
 */
const NO_NETWORK = [
  { name: 'fetch', message: 'Ağ isteği yasak: çizimler tarayıcıdan çıkmamalı.' },
  { name: 'XMLHttpRequest', message: 'Ağ isteği yasak.' },
  { name: 'WebSocket', message: 'Ağ isteği yasak.' },
  { name: 'EventSource', message: 'Ağ isteği yasak.' },
  { name: 'RTCPeerConnection', message: 'Ağ isteği yasak.' },
  { name: 'importScripts', message: 'Harici betik yükleme yasak.' },
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-globals': ['error', ...NO_NETWORK],
      'no-restricted-properties': [
        'error',
        { object: 'navigator', property: 'sendBeacon', message: 'Ağ isteği yasak.' },
        { object: 'window', property: 'fetch', message: 'Ağ isteği yasak.' },
        { object: 'globalThis', property: 'fetch', message: 'Ağ isteği yasak.' },
        { object: 'self', property: 'fetch', message: 'Ağ isteği yasak.' },
      ],
    },
  },
  {
    // core/ saf TypeScript olmalı: React, DOM durumu veya arayüz katmanına bağımlı olamaz.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'zustand'], message: 'core/ React/Zustand bağımsız olmalı.' },
            { group: ['**/ui/**', '**/state/**', '**/workers/**', '**/i18n/**'], message: 'core/ üst katmanlara bağımlı olamaz.' },
          ],
        },
      ],
    },
  },
);
