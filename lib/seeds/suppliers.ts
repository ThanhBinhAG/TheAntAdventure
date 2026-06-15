/* Auto-extracted from index.html — do not edit manually */

export const SEED_CRUISES = [
  {id:'SUP-C-001',name:'Bhaya Cruise Halong',route:'Halong Bay 2N3D / 3N2D',cabins:'Deluxe / Suite',rate:'$165–$280/cabin/night',valid:'Dec 2026',rating:'★★★★★'},
] as const;

export const SEED_TRANSPORT = [
  {id:'SUP-T-001',name:'Hanoi Luxury Transfer',region:'North',vehicles:'4-seat, 7-seat, 16-seat',rate:'$55–$120/day',notes:'Preferred partner'},
  {id:'SUP-T-002',name:'Central Vietnam Transport',region:'Central',vehicles:'4-seat, 7-seat',rate:'$60–$95/day',notes:'HUI/DAD specialist'},
  {id:'SUP-T-003',name:'Saigon Premium Cars',region:'South',vehicles:'4-seat, 7-seat, 16-seat',rate:'$50–$110/day',notes:'SGN specialist'},
] as const;

export const SEED_RESTAURANTS = [
  {id:'SUP-R-001',name:'Cha Ca La Vong',city:'Hanoi',cuisine:'Vietnamese Traditional',set:'$18/pax',cap:40,rating:'★★★★'},
  {id:'SUP-R-002',name:'The Deck Saigon',city:'Ho Chi Minh City',cuisine:'International / Vietnamese',set:'$35/pax',cap:80,rating:'★★★★★'},
  {id:'SUP-R-003',name:'Morning Glory Hoi An',city:'Hoi An',cuisine:'Central Vietnamese',set:'$22/pax',cap:60,rating:'★★★★'},
] as const;

export { SEED_EXTENDED_SUPPLIERS as SEED_SPECIAL_SUPPLIERS } from './extendedSuppliers';
