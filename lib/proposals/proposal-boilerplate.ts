/** Static copy from Material B2C/B2B proposal samples. */

export const PROPOSAL_TAGLINE_B2C = 'Where authentic adventure begins';

export const PROPOSAL_DEFAULT_INCLUSIONS = [
  'Accommodation based on twin or double room with daily breakfast throughout',
  'Private airport transfers and private air-conditioned transportation throughout',
  'English-speaking local guide as specified per region in the program',
  'Meals as indicated in the daily itinerary',
  'All sightseeing entrance fees and activities mentioned in the program',
  '1 bottle of mineral water per person per day throughout the tour',
  'All airport, hotel and service taxes throughout the tour',
];

export const PROPOSAL_DEFAULT_EXCLUSIONS = [
  'International airfare to/from Vietnam',
  'Travel insurance (strongly recommended)',
  'Personal expenses: beverages, laundry, telephone calls',
  'Tips and gratuities for guides, drivers and cruise crew',
  'Optional activities not mentioned in the program',
  'Vietnamese visa fees (if applicable)',
  'Early check-in or late check-out (subject to hotel availability)',
  'Peak season hotel supplements if applicable at time of final booking',
];

export const PROPOSAL_PAYMENT_TERMS = [
  {
    label: 'Deposit',
    detail:
      'A non-refundable deposit of 30% of the total tour cost is required to confirm your booking. All services will be held upon receipt of this deposit.',
  },
  {
    label: 'Balance Payment',
    detail: 'The remaining balance is due no later than 60 days prior to your departure date.',
  },
  {
    label: 'Late Bookings',
    detail: 'For bookings made within 60 days of departure, full payment (100%) is required at time of booking.',
  },
  {
    label: 'Payment Method',
    detail:
      'All payments are to be made by international bank transfer in USD. Bank details will be provided upon booking confirmation.',
  },
];

export const PROPOSAL_CANCELLATION_POLICY = [
  { notice: '60 days or more', charge: 'Deposit forfeited. No further charge.' },
  { notice: '45 – 59 days', charge: '50% of total tour cost.' },
  { notice: '30 – 44 days', charge: '75% of total tour cost.' },
  { notice: '0 – 29 days / No Show', charge: '100% of total tour cost.' },
  {
    notice: 'Cruises & Flights',
    charge:
      'Supplier cancellation terms for cruises and domestic flights may supersede the schedule above and will be advised at time of booking.',
  },
];

export const PROPOSAL_AMENDMENT_POLICY = [
  {
    label: 'Date / Itinerary Changes',
    detail:
      'Amendments requested 45 days or more before departure are subject to a USD 50 per person administration fee, plus any applicable supplier charges. Availability cannot be guaranteed.',
  },
  {
    label: 'Late Amendments',
    detail:
      'Amendments requested within 45 days of departure may be treated as a cancellation and rebooking, and the cancellation policy above will apply.',
  },
  {
    label: 'Name Changes',
    detail: 'Name changes are subject to a USD 25 per change administration fee and must be confirmed in writing.',
  },
];

export const PROPOSAL_IMPORTANT_NOTES = [
  {
    title: 'Travel Insurance',
    body: 'Travel insurance is strongly recommended for all guests. Coverage should include trip cancellation, medical expenses, emergency evacuation, and personal liability.',
  },
  {
    title: 'Visa Requirements',
    body: 'Vietnamese visa requirements vary by nationality. Please verify entry requirements with your local Vietnamese consulate or embassy prior to travel. Visa fees are not included in the tour price.',
  },
  {
    title: 'Health & Vaccinations',
    body: 'We recommend consulting your doctor or a travel health clinic regarding any vaccinations or health precautions prior to travel to Vietnam.',
  },
  {
    title: 'Force Majeure',
    body: 'The Ant Adventures accepts no liability for cancellations, delays, or alterations caused by circumstances beyond our reasonable control, including natural disasters, political unrest, pandemics, government travel restrictions, or airline disruptions. We will make every effort to offer suitable alternative arrangements.',
  },
  {
    title: 'Pricing Validity',
    body: 'All prices are quoted in USD and valid for the travel dates and group size specified in this proposal only. Prices are subject to change until a deposit is received and the booking is confirmed in writing.',
  },
];

export const PROPOSAL_FLIGHT_NOTE =
  'Flight prices are estimated and subject to airline availability at time of booking. Economy class included; business class upgrade on request.';

export const PROPOSAL_B2B_FOOTER_NOTE =
  'This quotation is prepared exclusively for B2B partners. All rates are net and do not include agent commission. Valid for travel dates specified only.';
