import type { TowerIntrinsicElements } from './types';

declare global {
  namespace JSX {
    interface IntrinsicElements extends TowerIntrinsicElements {}
  }
}

export {};
