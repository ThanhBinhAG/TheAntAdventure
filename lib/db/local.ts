import { useStore } from '../store';
import type { Agent, Booking, Customer, Guide, Lead } from '../types';

export const db = {
  customers: {
    getAll: () => useStore.getState().customers,
    getById: (id: string) => useStore.getState().customers.find((c) => c.id === id),
    create: (data: Customer) => useStore.getState().addCustomer(data),
    update: (id: string, data: Partial<Customer>) => useStore.getState().updateCustomer(id, data),
    delete: (id: string) => useStore.getState().deleteCustomer(id),
  },
  leads: {
    getAll: () => useStore.getState().leads,
    getById: (id: string) => useStore.getState().leads.find((l) => l.id === id),
    create: (data: Lead) => useStore.getState().addLead(data),
    update: (id: string, data: Partial<Lead>) => useStore.getState().updateLead(id, data),
    delete: (id: string) => useStore.getState().deleteLead(id),
  },
  bookings: {
    getAll: () => useStore.getState().bookings,
    getById: (id: string) => useStore.getState().bookings.find((b) => b.id === id),
    create: (data: Booking) => useStore.getState().addBooking(data),
    update: (id: string, data: Partial<Booking>) => useStore.getState().updateBooking(id, data),
    delete: (id: string) => useStore.getState().deleteBooking(id),
  },
  agents: {
    getAll: () => useStore.getState().agents,
    getById: (id: string) => useStore.getState().agents.find((a) => a.id === id),
  },
  guides: {
    getAll: () => useStore.getState().guides,
    getById: (id: string) => useStore.getState().guides.find((g) => g.id === id),
  },
};
