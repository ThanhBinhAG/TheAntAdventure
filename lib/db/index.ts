import { db as supabaseDb } from './supabase';

/** CRM data is Supabase-only — in-memory Zustand is a session cache hydrated from remote. */
export const db = supabaseDb;
