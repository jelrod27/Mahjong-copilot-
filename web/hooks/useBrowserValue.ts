'use client';

import { useRef, useSyncExternalStore } from 'react';

// These values are read once and never change underneath us, so there is
// nothing to subscribe to.
const noSubscribe = () => () => {};

/**
 * Reads a value that only exists in the browser — localStorage, cookies —
 * without a hydration mismatch.
 *
 * The server render and the hydration pass both see `serverValue`; every
 * render after that sees `read()`. This is what an on-mount `setState` was
 * approximating, minus the wasted render and the flash of placeholder.
 *
 * The snapshot is cached deliberately: useSyncExternalStore compares
 * snapshots by identity, so a `read` that builds a fresh object would look
 * like a new value on every render and loop forever.
 */
export function useBrowserValue<T>(read: () => T, serverValue: T): T {
  const cache = useRef<{ value: T } | null>(null);

  return useSyncExternalStore(
    noSubscribe,
    () => {
      cache.current ??= { value: read() };
      return cache.current.value;
    },
    () => serverValue,
  );
}
