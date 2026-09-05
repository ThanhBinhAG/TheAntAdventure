'use client';

import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import { applyAppearanceToDocument } from '@/lib/theme/apply-theme';
import type { CrmFontSizeId } from '@/lib/theme/font-size';
import { isCrmFontSizeId } from '@/lib/theme/font-size';
import type { CrmThemeId } from '@/lib/theme/presets';
import {
  isCrmThemeId,
  readStoredFontSize,
  readStoredTheme,
  writeStoredFontSize,
  writeStoredTheme,
} from '@/lib/theme/theme-storage';

const appearanceListeners = new Set<() => void>();

function emitAppearanceChange() {
  appearanceListeners.forEach((listener) => listener());
}

function subscribeAppearance(onStoreChange: () => void) {
  appearanceListeners.add(onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    appearanceListeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function readAppearanceSnapshot(): string {
  return `${readStoredTheme()}|${readStoredFontSize()}`;
}

/** Apply stored theme + font size on CRM shell mount and when either changes. */
export function ThemeBootstrap() {
  const { themeId, fontSizeId } = useTheme();
  useLayoutEffect(() => {
    applyAppearanceToDocument(themeId, fontSizeId);
  }, [themeId, fontSizeId]);
  return null;
}

/** Global CRM UI appearance: color preset + font size (localStorage). */
export function useTheme(): {
  themeId: CrmThemeId;
  fontSizeId: CrmFontSizeId;
  setTheme: (id: CrmThemeId) => void;
  setFontSize: (id: CrmFontSizeId) => void;
} {
  const snapshot = useSyncExternalStore(
    subscribeAppearance,
    readAppearanceSnapshot,
    () => 'default|medium',
  );
  const [themeIdRaw, fontSizeIdRaw] = snapshot.split('|');
  const themeId: CrmThemeId = isCrmThemeId(themeIdRaw) ? themeIdRaw : 'default';
  const fontSizeId: CrmFontSizeId = isCrmFontSizeId(fontSizeIdRaw)
    ? fontSizeIdRaw
    : 'medium';

  const setTheme = useCallback((id: CrmThemeId) => {
    if (!isCrmThemeId(id)) return;
    writeStoredTheme(id);
    applyAppearanceToDocument(id, readStoredFontSize());
    emitAppearanceChange();
  }, []);

  const setFontSize = useCallback((id: CrmFontSizeId) => {
    if (!isCrmFontSizeId(id)) return;
    writeStoredFontSize(id);
    applyAppearanceToDocument(readStoredTheme(), id);
    emitAppearanceChange();
  }, []);

  return { themeId, fontSizeId, setTheme, setFontSize };
}
