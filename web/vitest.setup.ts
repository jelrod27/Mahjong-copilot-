import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

class InMemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new InMemoryStorage(),
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
  value: new InMemoryStorage(),
  configurable: true,
  writable: true,
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
