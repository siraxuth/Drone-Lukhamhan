'use client';

import { useSyncExternalStore } from 'react';

const query = '(pointer: coarse)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function useTouchControls() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => null);
}
