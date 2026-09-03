export type FormDraftScope = 'customers' | 'agents';

export type FormDraftMode = 'add' | 'edit';

export type FormDraftEnvelope<T> = {
  version: 1;
  updatedAt: string;
  payload: T;
  /** Short label for toolbar chips (name / email). */
  label?: string;
};

export type FormDraftListItem = {
  /** Storage id: unique draft id for add, entity id for edit. */
  id: string;
  mode: FormDraftMode;
  updatedAt: string;
  label: string;
};

const STORAGE_PREFIX = 'crm.formDraft';
/** Legacy single add-draft key (pre multi-draft). */
export const LEGACY_ADD_DRAFT_ID = 'new';

export function createFormDraftId(): string {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formDraftStorageKey(
  scope: FormDraftScope,
  mode: FormDraftMode,
  id: string,
): string {
  return `${STORAGE_PREFIX}.${scope}.${mode}.${id}`;
}

function scopePrefix(scope: FormDraftScope): string {
  return `${STORAGE_PREFIX}.${scope}.`;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseEnvelope<T>(raw: string): FormDraftEnvelope<T> | null {
  try {
    const parsed = JSON.parse(raw) as FormDraftEnvelope<T>;
    if (!parsed || parsed.version !== 1 || parsed.payload === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Migrate legacy `…add.new` into a unique add draft id (once). */
export function migrateLegacyAddDraft(scope: FormDraftScope): string | null {
  if (!canUseStorage()) return null;
  const legacyKey = formDraftStorageKey(scope, 'add', LEGACY_ADD_DRAFT_ID);
  try {
    const raw = window.localStorage.getItem(legacyKey);
    if (!raw) return null;
    const envelope = parseEnvelope<unknown>(raw);
    if (!envelope) {
      window.localStorage.removeItem(legacyKey);
      return null;
    }
    const id = createFormDraftId();
    const next: FormDraftEnvelope<unknown> = {
      ...envelope,
      label: envelope.label?.trim() || 'Draft',
      updatedAt: envelope.updatedAt || new Date().toISOString(),
    };
    window.localStorage.setItem(formDraftStorageKey(scope, 'add', id), JSON.stringify(next));
    window.localStorage.removeItem(legacyKey);
    return id;
  } catch {
    return null;
  }
}

export function readFormDraft<T>(
  scope: FormDraftScope,
  mode: FormDraftMode,
  id: string,
): FormDraftEnvelope<T> | null {
  if (!canUseStorage() || !id) return null;
  try {
    const raw = window.localStorage.getItem(formDraftStorageKey(scope, mode, id));
    if (!raw) return null;
    return parseEnvelope<T>(raw);
  } catch {
    return null;
  }
}

export function writeFormDraft<T>(
  scope: FormDraftScope,
  mode: FormDraftMode,
  id: string,
  payload: T,
  label?: string,
): void {
  if (!canUseStorage() || !id) return;
  try {
    const envelope: FormDraftEnvelope<T> = {
      version: 1,
      updatedAt: new Date().toISOString(),
      payload,
      label: label?.trim() || undefined,
    };
    window.localStorage.setItem(formDraftStorageKey(scope, mode, id), JSON.stringify(envelope));
  } catch {
    // Quota / private mode — fail silently; leave still proceeds.
  }
}

export function clearFormDraft(scope: FormDraftScope, mode: FormDraftMode, id: string): void {
  if (!canUseStorage() || !id) return;
  try {
    window.localStorage.removeItem(formDraftStorageKey(scope, mode, id));
  } catch {
    // ignore
  }
}

/**
 * Lists all drafts for a scope (add + edit), newest first.
 * Migrates legacy `add.new` before scanning.
 */
export function listFormDrafts(scope: FormDraftScope): FormDraftListItem[] {
  if (!canUseStorage()) return [];
  migrateLegacyAddDraft(scope);

  const prefix = scopePrefix(scope);
  const items: FormDraftListItem[] = [];

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const dot = rest.indexOf('.');
      if (dot <= 0) continue;
      const mode = rest.slice(0, dot) as FormDraftMode;
      const id = rest.slice(dot + 1);
      if (mode !== 'add' && mode !== 'edit') continue;
      if (!id || id === LEGACY_ADD_DRAFT_ID) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const envelope = parseEnvelope<unknown>(raw);
      if (!envelope) continue;

      items.push({
        id,
        mode,
        updatedAt: envelope.updatedAt || '',
        label: envelope.label?.trim() || 'Draft',
      });
    }
  } catch {
    return [];
  }

  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return items;
}
