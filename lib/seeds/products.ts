/**
 * Minimal service products that must exist even when remote DB / portfolio import
 * omits them. Full catalogue lives on Supabase only — do not re-seed ~196 tours here.
 */
export const AA_PRODUCTS = [
  {
    code: 'SV-SVC-VOA-01',
    name: 'E-Visa Support Service',
    logic: 'Online e-visa application assistance',
    dur: 'Service',
    cat: 'Visa',
    dest: 'All Vietnam',
    lvl: 'Standard',
    desc: 'Full assistance with Vietnam e-visa application for eligible nationalities. Document checklist, form guidance, and confirmation follow-up. Processing time: 3 business days standard.',
    usp: 'The Ant Adventures team',
    price: '',
    region: 'services',
  },
  {
    code: 'SV-SGN-HD-01',
    name: 'Arrival Fast Track (Airport)',
    logic: 'VIP arrival lane | Meet & greet | Immigration fast track | Luggage',
    dur: 'Service',
    cat: 'Transfer',
    dest: 'SGN / HAN / DAD',
    lvl: 'Standard',
    desc: 'VIP meet-and-greet service at Tan Son Nhat (SGN), Noi Bai (HAN), or Da Nang (DAD) airport. Representative meets clients before immigration, assists through priority lane, and escorts to private transfer vehicle. Luggage handling included.',
    usp: 'The Ant Adventures operations team',
    price: '',
    region: 'services',
  },
  {
    code: 'SV-SGN-HD-02',
    name: 'Departure Fast Track (Airport)',
    logic: 'VIP departure | Check-in assistance | Priority security | Lounge',
    dur: 'Service',
    cat: 'Transfer',
    dest: 'SGN / HAN / DAD',
    lvl: 'Standard',
    desc: 'VIP departure assistance at Tan Son Nhat (SGN), Noi Bai (HAN), or Da Nang (DAD). Representative meets clients at the airport entrance, assists with check-in, escorts through priority security, and arranges lounge access where available.',
    usp: 'The Ant Adventures operations team',
    price: '',
    region: 'services',
  },
] as const;
