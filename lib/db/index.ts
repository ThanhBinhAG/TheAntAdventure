import { isRemoteDataEnabled } from '../env';
import { db as localDb } from './local';
import { db as supabaseDb } from './supabase';

export const db = isRemoteDataEnabled() ? supabaseDb : localDb;
