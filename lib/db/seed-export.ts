/**
 * Builds a full BackupData object from lib/seeds (same as fresh Zustand store).
 */
import * as seeds from '../seeds';
import type { BackupData, ChatMessages, Customer, Comm, Lead, Booking, Agent, Guide, Product, StaffMember } from '../types';

export function seedStateForExport(): BackupData {
  return {
    customers: [...seeds.SEED_CUSTOMERS] as unknown as Customer[],
    comms: [...seeds.SEED_COMMS] as unknown as Comm[],
    leads: [...seeds.SEED_LEADS] as unknown as Lead[],
    bookings: [...seeds.SEED_BOOKINGS] as unknown as Booking[],
    agents: [...seeds.SEED_AGENTS] as unknown as Agent[],
    guides: [...seeds.SEED_GUIDES] as unknown as Guide[],
    products: [...seeds.AA_PRODUCTS] as unknown as Product[],
    finance: [...seeds.SEED_FINANCE],
    ar: [...seeds.SEED_AR],
    ap: [...seeds.SEED_AP],
    tax: [...seeds.SEED_TAX],
    staff: [...seeds.SEED_STAFF] as unknown as StaffMember[],
    tasks: [...seeds.SEED_TASKS],
    feedback: [...seeds.SEED_FEEDBACK],
    contracts: [...seeds.SEED_CONTRACTS],
    photos: [...seeds.SEED_PHOTOS],
    messages: { ...seeds.SEED_MESSAGES } as unknown as ChatMessages,
    calEvents: [...seeds.SEED_CAL_EVENTS],
    devNotes: [...seeds.SEED_DEV_NOTES],
    cruises: [...seeds.SEED_CRUISES],
    transport: [...seeds.SEED_TRANSPORT],
    restaurants: [...seeds.SEED_RESTAURANTS],
    specialSuppliers: [...seeds.SEED_SPECIAL_SUPPLIERS],
    exportedAt: new Date().toISOString(),
    version: '4.3',
  };
}
