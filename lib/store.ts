import { create, type StateCreator } from 'zustand';
import { applyLocalCustomerDelete } from './customers/customer-delete';
import { clientLog } from './system/client-logger';
import { rolloverTasks } from './planner/planner-task-utils';
import { localTodayIso } from './core/date-utils';
import type {
  Agent,
  Attraction,
  BackupData,
  Booking,
  ChatMessages,
  Comm,
  CruiseSupplier,
  Customer,
  ExtendedSupplier,
  Guide,
  Hotel,
  Lead,
  Product,
  ProductPricing,
  RestaurantSupplier,
  StaffMember,
  Task,
  TourDraft,
  TourOutlineDay,
  TransportSupplier,
} from './types';
import { emptyProductPricing, priceLabelFromRow } from './products/product-pricing-helpers';

interface CRMState {
  customers: Customer[];
  comms: Comm[];
  leads: Lead[];
  bookings: Booking[];
  agents: Agent[];
  attractions: Attraction[];
  guides: Guide[];
  products: Product[];
  productPricing: ProductPricing[];
  finance: unknown[];
  ar: unknown[];
  ap: unknown[];
  tax: unknown[];
  staff: StaffMember[];
  tasks: unknown[];
  feedback: unknown[];
  contracts: unknown[];
  photoFolders: unknown[];
  photos: unknown[];
  messages: ChatMessages;
  calEvents: unknown[];
  devNotes: unknown[];
  hotels: Hotel[];
  cruises: CruiseSupplier[];
  transport: TransportSupplier[];
  restaurants: RestaurantSupplier[];
  specialSuppliers: ExtendedSupplier[];
  tourDrafts: TourDraft[];
  tourOutlineDays: TourOutlineDay[];

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

  setTourDrafts: (drafts: TourDraft[]) => void;
  upsertTourDraft: (draft: TourDraft) => void;
  setTourOutlineDays: (days: TourOutlineDay[]) => void;
  replaceOutlineDaysForDraft: (draftId: string, days: TourOutlineDay[]) => void;

  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, data: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  setAttractions: (attractions: Attraction[]) => void;
  addAttraction: (attraction: Attraction) => void;
  updateAttraction: (id: string, data: Partial<Attraction>) => void;
  deleteAttraction: (id: string) => void;
  setGuides: (guides: Guide[]) => void;
  addGuide: (guide: Guide) => void;
  updateGuide: (id: string, data: Partial<Guide>) => void;
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (code: string, data: Partial<Product>) => void;
  deleteProduct: (code: string) => void;
  setProductPricing: (rows: ProductPricing[]) => void;
  upsertProductPricing: (row: ProductPricing, syncProductPrice?: boolean) => void;
  deleteProductPricing: (productCode: string) => void;
  setContracts: (contracts: unknown[]) => void;
  addContract: (contract: Record<string, unknown>) => void;
  updateContract: (id: string, data: Record<string, unknown>) => void;
  deleteContract: (id: string) => void;
  setFinance: (finance: unknown[]) => void;
  setAr: (ar: unknown[]) => void;
  setAp: (ap: unknown[]) => void;
  setTax: (tax: unknown[]) => void;
  setStaff: (staff: StaffMember[]) => void;
  setFeedback: (feedback: unknown[]) => void;
  addFeedback: (item: Record<string, unknown>) => void;
  setDevNotes: (notes: unknown[]) => void;
  addDevNote: (note: Record<string, unknown>) => void;
  removeDevNote: (id: string) => void;
  updateDevNote: (id: string, data: Record<string, unknown>) => void;
  addSpecialSupplier: (supplier: ExtendedSupplier) => void;
  updateSpecialSupplier: (id: string, data: Partial<ExtendedSupplier>) => void;
  removeSpecialSupplier: (id: string) => void;
  setSpecialSuppliers: (suppliers: ExtendedSupplier[]) => void;
  addHotel: (hotel: Hotel) => void;
  updateHotel: (id: string, data: Partial<Hotel>) => void;
  removeHotel: (id: string) => void;
  setHotels: (hotels: Hotel[]) => void;
  addTransport: (row: TransportSupplier) => void;
  updateTransport: (id: string, data: Partial<TransportSupplier>) => void;
  removeTransport: (id: string) => void;
  setTransport: (rows: TransportSupplier[]) => void;
  addRestaurant: (row: RestaurantSupplier) => void;
  updateRestaurant: (id: string, data: Partial<RestaurantSupplier>) => void;
  removeRestaurant: (id: string) => void;
  setRestaurants: (rows: RestaurantSupplier[]) => void;
  addCruise: (row: CruiseSupplier) => void;
  updateCruise: (id: string, data: Partial<CruiseSupplier>) => void;
  removeCruise: (id: string) => void;
  setCruises: (rows: CruiseSupplier[]) => void;
  setCalEvents: (events: unknown[]) => void;
  addCalEvent: (event: Record<string, unknown>) => void;
  removeCalEvent: (id: string) => void;
  setPhotos: (photos: Record<string, unknown>[]) => void;
  addTask: (task: Record<string, unknown>) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (id: string, data: Record<string, unknown>) => void;
  rolloverIncompleteTasks: () => void;

  /** Local JSON backup/restore for dev support — not a Supabase sync path (D2.13). */
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
  attractions: [] as Attraction[],
  guides: [] as Guide[],
  products: [] as Product[],
  productPricing: [] as ProductPricing[],
  finance: [] as unknown[],
  ar: [] as unknown[],
  ap: [] as unknown[],
  tax: [] as unknown[],
  staff: [] as StaffMember[],
  tasks: [] as unknown[],
  feedback: [] as unknown[],
  contracts: [] as unknown[],
  photoFolders: [] as unknown[],
  photos: [] as unknown[],
  messages: {} as ChatMessages,
  calEvents: [] as unknown[],
  devNotes: [] as unknown[],
  hotels: [] as Hotel[],
  cruises: [] as CruiseSupplier[],
  transport: [] as TransportSupplier[],
  restaurants: [] as RestaurantSupplier[],
  specialSuppliers: [] as ExtendedSupplier[],
  tourDrafts: [] as TourDraft[],
  tourOutlineDays: [] as TourOutlineDay[],
});

const crmStateCreator: StateCreator<CRMState> = (set, get) => ({
      ...emptyState(),
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
        set((s) =>
          applyLocalCustomerDelete(id, {
            customers: s.customers,
            leads: s.leads,
            comms: s.comms,
            tourDrafts: s.tourDrafts,
            tourOutlineDays: s.tourOutlineDays,
            feedback: s.feedback,
          })
        ),

      setComms: (comms) => set({ comms }),
      addComm: (comm) => set((s) => ({ comms: [comm, ...s.comms] })),

      setLeads: (leads) => set({ leads }),
      addLead: (lead) => set((s) => ({ leads: [...s.leads, lead] })),
      updateLead: (id, data) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...data } : l)),
        })),
      deleteLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

      setTourDrafts: (tourDrafts) => set({ tourDrafts }),
      upsertTourDraft: (draft) =>
        set((s) => {
          const idx = s.tourDrafts.findIndex((d) => d.id === draft.id);
          const tourDrafts =
            idx >= 0
              ? s.tourDrafts.map((d, i) => (i === idx ? { ...d, ...draft } : d))
              : [...s.tourDrafts, draft];
          return { tourDrafts };
        }),
      setTourOutlineDays: (tourOutlineDays) => set({ tourOutlineDays }),
      replaceOutlineDaysForDraft: (draftId, days) =>
        set((s) => ({
          tourOutlineDays: [
            ...s.tourOutlineDays.filter((d) => d.draftId !== draftId),
            ...days,
          ],
        })),

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
      setAttractions: (attractions) => set({ attractions }),
      addAttraction: (attraction) => set((s) => ({ attractions: [...s.attractions, attraction] })),
      updateAttraction: (id, data) =>
        set((s) => ({
          attractions: s.attractions.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),
      deleteAttraction: (id) =>
        set((s) => ({ attractions: s.attractions.filter((a) => a.id !== id) })),
      setGuides: (guides) => set({ guides }),
      addGuide: (guide) => set((s) => ({ guides: [...s.guides, guide] })),
      updateGuide: (id, data) =>
        set((s) => ({
          guides: s.guides.map((g) => (g.id === id ? { ...g, ...data } : g)),
        })),
      setProducts: (products) => set({ products }),
      addProduct: (product) =>
        set((s) => {
          const hasPricing = s.productPricing.some((p) => p.productCode === product.code);
          return {
            products: [...s.products, product],
            productPricing: hasPricing ? s.productPricing : [...s.productPricing, emptyProductPricing(product.code)],
          };
        }),
      updateProduct: (code, data) =>
        set((s) => ({
          products: s.products.map((p) => (p.code === code ? { ...p, ...data } : p)),
        })),
      deleteProduct: (code) => {
        set((s) => ({
          products: s.products.filter((p) => p.code !== code),
          productPricing: s.productPricing.filter((p) => p.productCode !== code),
        }));
      },
      setProductPricing: (productPricing) => set({ productPricing }),
      upsertProductPricing: (row, syncProductPrice = true) =>
        set((s) => {
          const exists = s.productPricing.some((p) => p.productCode === row.productCode);
          const productPricing = exists
            ? s.productPricing.map((p) => (p.productCode === row.productCode ? row : p))
            : [...s.productPricing, row];
          if (!syncProductPrice) return { productPricing };
          const price = priceLabelFromRow(row, 2);
          const products = s.products.map((p) =>
            p.code === row.productCode ? { ...p, price } : p
          );
          return { productPricing, products };
        }),
      deleteProductPricing: (productCode) => {
        set((s) => ({
          productPricing: s.productPricing.filter((p) => p.productCode !== productCode),
        }));
      },
      setContracts: (contracts) => set({ contracts }),
      setFinance: (finance) => set({ finance }),
      setAr: (ar) => set({ ar }),
      setAp: (ap) => set({ ap }),
      setTax: (tax) => set({ tax }),
      setStaff: (staff) => set({ staff }),
      addContract: (contract) => set((s) => ({ contracts: [contract, ...s.contracts] })),
      updateContract: (id, data) =>
        set((s) => ({
          contracts: s.contracts.map((c) => {
            const row = c as { id?: string };
            return row.id === id ? { ...row, ...data } : c;
          }),
        })),
      deleteContract: (id) =>
        set((s) => ({
          contracts: s.contracts.filter((c) => (c as { id?: string }).id !== id),
        })),
      setFeedback: (feedback) => set({ feedback }),
      addFeedback: (item) => set((s) => ({ feedback: [...s.feedback, item] })),
      setDevNotes: (devNotes) => set({ devNotes }),
      addDevNote: (note) => set((s) => ({ devNotes: [note, ...s.devNotes] })),
      removeDevNote: (id) =>
        set((s) => ({
          devNotes: s.devNotes.filter((n) => (n as { id?: string }).id !== id),
        })),
      updateDevNote: (id, data) =>
        set((s) => ({
          devNotes: s.devNotes.map((n) => {
            const row = n as { id?: string };
            return row.id === id ? { ...row, ...data } : n;
          }),
        })),
      addSpecialSupplier: (supplier) =>
        set((s) => ({ specialSuppliers: [supplier, ...s.specialSuppliers] })),
      updateSpecialSupplier: (id, data) =>
        set((s) => ({
          specialSuppliers: s.specialSuppliers.map((x) => (x.id === id ? { ...x, ...data } : x)),
        })),
      removeSpecialSupplier: (id) =>
        set((s) => ({
          specialSuppliers: s.specialSuppliers.filter((x) => x.id !== id),
        })),
      setSpecialSuppliers: (specialSuppliers) => set({ specialSuppliers }),
      addHotel: (hotel) => set((s) => ({ hotels: [...s.hotels, hotel] })),
      updateHotel: (id, data) =>
        set((s) => ({
          hotels: s.hotels.map((h) => (h.id === id ? { ...h, ...data } : h)),
        })),
      removeHotel: (id) => set((s) => ({ hotels: s.hotels.filter((h) => h.id !== id) })),
      setHotels: (hotels) => set({ hotels }),
      addTransport: (row) => set((s) => ({ transport: [...s.transport, row] })),
      updateTransport: (id, data) =>
        set((s) => ({
          transport: s.transport.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      removeTransport: (id) => set((s) => ({ transport: s.transport.filter((t) => t.id !== id) })),
      setTransport: (transport) => set({ transport }),
      addRestaurant: (row) => set((s) => ({ restaurants: [...s.restaurants, row] })),
      updateRestaurant: (id, data) =>
        set((s) => ({
          restaurants: s.restaurants.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),
      removeRestaurant: (id) => set((s) => ({ restaurants: s.restaurants.filter((r) => r.id !== id) })),
      setRestaurants: (restaurants) => set({ restaurants }),
      addCruise: (row) => set((s) => ({ cruises: [...s.cruises, row] })),
      updateCruise: (id, data) =>
        set((s) => ({
          cruises: s.cruises.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      removeCruise: (id) => set((s) => ({ cruises: s.cruises.filter((c) => c.id !== id) })),
      setCruises: (cruises) => set({ cruises }),
      setCalEvents: (calEvents) => set({ calEvents }),
      addCalEvent: (event) => set((s) => ({ calEvents: [...s.calEvents, event] })),
      removeCalEvent: (id) =>
        set((s) => ({
          calEvents: s.calEvents.filter((x) => (x as { id?: string }).id !== id),
        })),
      setPhotos: (photos) => set({ photos }),
      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      setTasks: (tasks) => set({ tasks }),
      updateTask: (id, data) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            const row = t as { id?: string };
            return row.id === id ? { ...row, ...data } : t;
          }),
        })),
      rolloverIncompleteTasks: () =>
        set((s) => {
          const today = localTodayIso();
          const { tasks, changed } = rolloverTasks(s.tasks as Task[], today);
          return changed ? { tasks } : s;
        }),

      exportBackup: () => {
        const s = get();
        return {
          customers: s.customers,
          comms: s.comms,
          leads: s.leads,
          bookings: s.bookings,
          agents: s.agents,
          attractions: s.attractions,
          guides: s.guides,
          products: s.products,
          productPricing: s.productPricing,
          finance: s.finance,
          ar: s.ar,
          ap: s.ap,
          tax: s.tax,
          staff: s.staff,
          tasks: s.tasks,
          feedback: s.feedback,
          contracts: s.contracts,
          photoFolders: s.photoFolders,
          photos: s.photos,
          messages: s.messages,
          calEvents: s.calEvents,
          devNotes: s.devNotes,
          hotels: s.hotels,
          cruises: s.cruises,
          transport: s.transport,
          restaurants: s.restaurants,
          specialSuppliers: s.specialSuppliers,
          tourDrafts: s.tourDrafts,
          tourOutlineDays: s.tourOutlineDays,
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
          attractions: data.attractions ?? get().attractions,
          guides: data.guides ?? get().guides,
          products: data.products ?? get().products,
          productPricing: data.productPricing ?? get().productPricing,
          finance: data.finance ?? get().finance,
          ar: data.ar ?? get().ar,
          ap: data.ap ?? get().ap,
          tax: data.tax ?? get().tax,
          staff: data.staff ?? get().staff,
          tasks: data.tasks ?? get().tasks,
          feedback: data.feedback ?? get().feedback,
          contracts: data.contracts ?? get().contracts,
          photoFolders: data.photoFolders ?? get().photoFolders,
          photos: data.photos ?? get().photos,
          messages: data.messages ?? get().messages,
          calEvents: data.calEvents ?? get().calEvents,
          devNotes: data.devNotes ?? get().devNotes,
          hotels: data.hotels ?? get().hotels,
          cruises: data.cruises ?? get().cruises,
          transport: data.transport ?? get().transport,
          restaurants: data.restaurants ?? get().restaurants,
          specialSuppliers: data.specialSuppliers ?? get().specialSuppliers,
          tourDrafts: data.tourDrafts ?? get().tourDrafts,
          tourOutlineDays: data.tourOutlineDays ?? get().tourOutlineDays,
          lastBackup: new Date().toLocaleString("en-US"),
        }),

      resetToSeeds: () => {
        clientLog('store', 'resetToSeeds is disabled — data is stored in Supabase only', {
          level: 'warn',
        });
      },
    });

export const useStore = create<CRMState>()(crmStateCreator);
