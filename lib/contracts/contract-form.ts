export const DEFAULT_CONTRACT_INCLUSIONS = `Private English-speaking guide throughout
All accommodation as per itinerary
Daily breakfast and meals as specified
Private air-conditioned vehicle & driver
All entrance fees and activities listed
Bottled water during touring`;

export const DEFAULT_CONTRACT_EXCLUSIONS = `International flights to/from Vietnam
Travel insurance (strongly recommended)
Personal expenses, tips & gratuities
Visa fees (unless specified)
Meals not mentioned in the itinerary`;

export type ContractFormData = {
  bookingId: string;
  clientName: string;
  nationality: string;
  pax: number;
  rooms: string;
  tourName: string;
  duration: string;
  departureDate: string;
  returnDate: string;
  route: string;
  inclusions: string;
  exclusions: string;
  flights: string;
  currency: string;
  total: number;
  depositPct: number;
  balanceDueDate: string;
  notes: string;
};

export type ContractFormErrorField =
  | 'clientName'
  | 'tourName'
  | 'pax'
  | 'departureDate'
  | 'returnDate'
  | 'total';

export const EMPTY_CONTRACT_FORM: ContractFormData = {
  bookingId: '',
  clientName: '',
  nationality: '',
  pax: 2,
  rooms: '',
  tourName: '',
  duration: '',
  departureDate: '',
  returnDate: '',
  route: '',
  inclusions: DEFAULT_CONTRACT_INCLUSIONS,
  exclusions: DEFAULT_CONTRACT_EXCLUSIONS,
  flights: '',
  currency: 'USD',
  total: 0,
  depositPct: 50,
  balanceDueDate: '',
  notes: '',
};

export type ContractFormErrorKey =
  | 'errClientName'
  | 'errTourName'
  | 'errPaxMin'
  | 'errReturnBeforeDeparture'
  | 'errTotalMin';

export type ContractFormValidationResult =
  | { ok: true }
  | { ok: false; field: ContractFormErrorField | null; errorKey: ContractFormErrorKey };

export function validateContractForm(form: ContractFormData): ContractFormValidationResult {
  if (!form.clientName.trim()) {
    return { ok: false, field: 'clientName', errorKey: 'errClientName' };
  }
  if (!form.tourName.trim()) {
    return { ok: false, field: 'tourName', errorKey: 'errTourName' };
  }
  if (!Number.isFinite(form.pax) || form.pax < 1) {
    return { ok: false, field: 'pax', errorKey: 'errPaxMin' };
  }
  if (form.departureDate && form.returnDate && form.returnDate < form.departureDate) {
    return { ok: false, field: 'returnDate', errorKey: 'errReturnBeforeDeparture' };
  }
  if (!Number.isFinite(form.total) || form.total < 0) {
    return { ok: false, field: 'total', errorKey: 'errTotalMin' };
  }
  return { ok: true };
}

export function contractDepositAmount(total: number, depositPct: number): number {
  return total * (depositPct / 100);
}
