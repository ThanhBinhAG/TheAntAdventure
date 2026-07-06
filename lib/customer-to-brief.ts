import type { Customer } from './types';
import { DEFAULT_TOUR_BRIEF, type TourBrief } from './tour-design-types';

export function customerToBrief(customer: Customer, existing?: Partial<TourBrief>): TourBrief {
  const base = { ...DEFAULT_TOUR_BRIEF, ...existing };
  const adults = customer.adults ?? (base.adults || 2);
  const children = customer.children ?? 0;
  const pax = adults + children;

  return {
    ...base,
    clientName: customer.name || base.clientName,
    clientEmail: customer.email || base.clientEmail,
    style: customer.style || base.style,
    language: customer.lang || base.language,
    agentRef: customer.agentName || base.agentRef,
    nationality: customer.nat || base.nationality,
    travelMonth: customer.travelMonth || base.travelMonth,
    hotelTier: customer.hotelTier || base.hotelTier,
    budgetRange: customer.budget || base.budgetRange,
    salesperson: customer.salesperson || base.salesperson,
    adults,
    children,
    pax,
    childAges: customer.childAges || base.childAges,
    childDiet: customer.childDiet || base.childDiet,
    childPrefs: customer.childPrefs || base.childPrefs,
    flights: customer.flights || base.flights,
    intlFlights: customer.intlFlights || base.intlFlights,
    visa: customer.visaStatus || base.visa,
    firstTime: customer.firstTime || base.firstTime,
    interestsText: customer.interests || base.interestsText,
    avoid: customer.donts || base.avoid,
    specialRequests: customer.notes || base.specialRequests,
  };
}
