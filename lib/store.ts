import { create, type StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { isRemoteDataEnabled } from './env';
import * as seeds from './seeds';
import type {
  Agent,
  BackupData,
  Booking,
  ChatMessages,
  Comm,
  Customer,
  Guide,
  Lead,
  Product,
  StaffMember,
} from './types';

interface CRMState {
  customers: Customer[];
  comms: Comm[];
  leads: Lead[];
  bookings: Booking[];
  agents: Agent[];
  guides: Guide[];
  products: Product[];
  finance: unknown[];
  ar: unknown[];
  ap: unknown[];
  tax: unknown[];
  staff: StaffMember[];
  tasks: unknown[];
  feedback: unknown[];
  contracts: unknown[];
  photos: unknown[];
  messages: ChatMessages;
  calEvents: unknown[];
  devNotes: unknown[];
  cruises: unknown[];
  transport: unknown[];
  restaurants: unknown[];
  specialSuppliers: unknown[];

  language: 'en' | 'vi';
  lastBackup: string | null;

  setLanguage: (lang: 'en' | 'vi') => void;
  setLastBackup: (ts: string) => void;

  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  setComms: (comms: Comm[]) => void;
  addComm: (comm: Comm) => void;

  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;

  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, data: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  setGuides: (guides: Guide[]) => void;
  addGuide: (guide: Guide) => void;
  updateGuide: (id: string, data: Partial<Guide>) => void;
  setProducts: (products: Product[]) => void;
  addContract: (contract: Record<string, unknown>) => void;
  updateContract: (id: string, data: Record<string, unknown>) => void;
  addFeedback: (item: Record<string, unknown>) => void;
  addDevNote: (note: Record<string, unknown>) => void;
  updateDevNote: (id: string, data: Record<string, unknown>) => void;
  addSpecialSupplier: (supplier: Record<string, unknown>) => void;
  removeSpecialSupplier: (id: string) => void;
  addCalEvent: (event: Record<string, unknown>) => void;
  removeCalEvent: (id: string) => void;
  addTask: (task: Record<string, unknown>) => void;
  updateTask: (id: string, data: Record<string, unknown>) => void;

  exportBackup: () => BackupData;
  importBackup: (data: BackupData) => void;
  resetToSeeds: () => void;
}

const emptyState = () => ({
  customers: [] as Customer[],
  comms: [] as Comm[],
  leads: [] as Lead[],
  bookings: [] as Booking[],
  agents: [] as Agent[],
  guides: [] as Guide[],
  products: [] as Product[],
  finance: [] as unknown[],
  ar: [] as unknown[],
  ap: [] as unknown[],
  tax: [] as unknown[],
  staff: [] as StaffMember[],
  tasks: [] as unknown[],
  feedback: [] as unknown[],
  contracts: [] as unknown[],
  photos: [] as unknown[],
  messages: {} as ChatMessages,
  calEvents: [] as unknown[],
  devNotes: [] as unknown[],
  cruises: [] as unknown[],
  transport: [] as unknown[],
  restaurants: [] as unknown[],
  specialSuppliers: [] as unknown[],
});

const seedState = () => ({
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
});

const crmStateCreator: StateCreator<CRMState> = (set, get) => ({
      ...(isRemoteDataEnabled() ? emptyState() : seedState()),
      language: 'en',
      lastBackup: null,

      setLanguage: (language) => set({ language }),
      setLastBackup: (lastBackup) => set({ lastBackup }),

      setCustomers: (customers) => set({ customers }),
      addCustomer: (customer) => set((s) => ({ customers: [...s.customers, customer] })),
      updateCustomer: (id, data) =>
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      deleteCustomer: (id) =>
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),

      setComms: (comms) => set({ comms }),
      addComm: (comm) => set((s) => ({ comms: [comm, ...s.comms] })),

      setLeads: (leads) => set({ leads }),
      addLead: (lead) => set((s) => ({ leads: [...s.leads, lead] })),
      updateLead: (id, data) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...data } : l)),
        })),
      deleteLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

      setBookings: (bookings) => set({ bookings }),
      addBooking: (booking) => set((s) => ({ bookings: [...s.bookings, booking] })),
      updateBooking: (id, data) =>
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...data } : b)),
        })),
      deleteBooking: (id) => set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),

      setAgents: (agents) => set({ agents }),
      addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
      updateAgent: (id, data) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),
      deleteAgent: (id) =>
        set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
      setGuides: (guides) => set({ guides }),
      addGuide: (guide) => set((s) => ({ guides: [...s.guides, guide] })),
      updateGuide: (id, data) =>
        set((s) => ({
          guides: s.guides.map((g) => (g.id === id ? { ...g, ...data } : g)),
        })),
      setProducts: (products) => set({ products }),
      addContract: (contract) => set((s) => ({ contracts: [contract, ...s.contracts] })),
      updateContract: (id, data) =>
        set((s) => ({
          contracts: s.contracts.map((c) => {
            const row = c as { id?: string };
            return row.id === id ? { ...row, ...data } : c;
          }),
        })),
      addFeedback: (item) => set((s) => ({ feedback: [...s.feedback, item] })),
      addDevNote: (note) => set((s) => ({ devNotes: [note, ...s.devNotes] })),
      updateDevNote: (id, data) =>
        set((s) => ({
          devNotes: s.devNotes.map((n) => {
            const row = n as { id?: string };
            return row.id === id ? { ...row, ...data } : n;
          }),
        })),
      addSpecialSupplier: (supplier) =>
        set((s) => ({ specialSuppliers: [supplier, ...s.specialSuppliers] })),
      removeSpecialSupplier: (id) =>
        set((s) => ({
          specialSuppliers: s.specialSuppliers.filter((x) => (x as { id?: string }).id !== id),
        })),
      addCalEvent: (event) => set((s) => ({ calEvents: [...s.calEvents, event] })),
      removeCalEvent: (id) =>
        set((s) => ({
          calEvents: s.calEvents.filter((x) => (x as { id?: string }).id !== id),
        })),
      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      updateTask: (id, data) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            const row = t as { id?: string };
            return row.id === id ? { ...row, ...data } : t;
          }),
        })),

      exportBackup: () => {
        const s = get();
        return {
          customers: s.customers,
          comms: s.comms,
          leads: s.leads,
          bookings: s.bookings,
          agents: s.agents,
          guides: s.guides,
          products: s.products,
          finance: s.finance,
          ar: s.ar,
          ap: s.ap,
          tax: s.tax,
          staff: s.staff,
          tasks: s.tasks,
          feedback: s.feedback,
          contracts: s.contracts,
          photos: s.photos,
          messages: s.messages,
          calEvents: s.calEvents,
          devNotes: s.devNotes,
          cruises: s.cruises,
          transport: s.transport,
          restaurants: s.restaurants,
          specialSuppliers: s.specialSuppliers,
          exportedAt: new Date().toISOString(),
          version: '4.3',
        };
      },

      importBackup: (data) =>
        set({
          customers: data.customers ?? get().customers,
          comms: data.comms ?? get().comms,
          leads: data.leads ?? get().leads,
          bookings: data.bookings ?? get().bookings,
          agents: data.agents ?? get().agents,
          guides: data.guides ?? get().guides,
          products: data.products ?? get().products,
          finance: data.finance ?? get().finance,
          ar: data.ar ?? get().ar,
          ap: data.ap ?? get().ap,
          tax: data.tax ?? get().tax,
          staff: data.staff ?? get().staff,
          tasks: data.tasks ?? get().tasks,
          feedback: data.feedback ?? get().feedback,
          contracts: data.contracts ?? get().contracts,
          photos: data.photos ?? get().photos,
          messages: data.messages ?? get().messages,
          calEvents: data.calEvents ?? get().calEvents,
          devNotes: data.devNotes ?? get().devNotes,
          cruises: data.cruises ?? get().cruises,
          transport: data.transport ?? get().transport,
          restaurants: data.restaurants ?? get().restaurants,
          specialSuppliers: data.specialSuppliers ?? get().specialSuppliers,
          lastBackup: new Date().toLocaleString("en-US"),
        }),

      resetToSeeds: () => set({ ...(isRemoteDataEnabled() ? emptyState() : seedState()), lastBackup: null }),
    });

const persistConfig = {
  name: 'ant-crm-v43',
  partialize: (state: CRMState) => ({
    customers: state.customers,
    comms: state.comms,
    leads: state.leads,
    bookings: state.bookings,
    agents: state.agents,
    guides: state.guides,
    products: state.products,
    finance: state.finance,
    ar: state.ar,
    ap: state.ap,
    tax: state.tax,
    staff: state.staff,
    tasks: state.tasks,
    feedback: state.feedback,
    contracts: state.contracts,
    photos: state.photos,
    messages: state.messages,
    calEvents: state.calEvents,
    devNotes: state.devNotes,
    cruises: state.cruises,
    transport: state.transport,
    restaurants: state.restaurants,
    specialSuppliers: state.specialSuppliers,
    lastBackup: state.lastBackup,
  }),
};

export const useStore = isRemoteDataEnabled()
  ? create<CRMState>()(crmStateCreator)
  : create<CRMState>()(persist(crmStateCreator, persistConfig));
