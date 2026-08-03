import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { customerToBrief } from '../lib/customers/customer-to-brief';
import type { Customer } from '../lib/types';

const sampleCustomer: Customer = {
  id: 'CUS-26-099',
  name: 'Jane Explorer',
  email: 'jane@example.com',
  phone: '+1',
  country: 'USA',
  nat: 'American',
  source: 'Website',
  style: 'Luxury',
  lang: 'English',
  notes: 'Anniversary trip',
  bookings: [],
  adults: 2,
  children: 1,
  childAges: '8',
  childDiet: 'No nuts',
  childPrefs: 'Swimming',
  flights: 'yes',
  intlFlights: 'not-included',
  visaStatus: 'exempt',
  firstTime: 'yes',
  interests: 'Culture, food',
  donts: 'Crowded markets',
  hotelTier: 'Boutique 4★',
  budget: '$3,000/pax',
  travelMonth: 'Nov',
  salesperson: 'Tai Pham',
};

describe('customerToBrief', () => {
  it('maps full customer profile into tour brief', () => {
    const brief = customerToBrief(sampleCustomer);

    assert.equal(brief.clientName, 'Jane Explorer');
    assert.equal(brief.clientEmail, 'jane@example.com');
    assert.equal(brief.pax, 3);
    assert.equal(brief.adults, 2);
    assert.equal(brief.children, 1);
    assert.equal(brief.childAges, '8');
    assert.equal(brief.childDiet, 'No nuts');
    assert.equal(brief.childPrefs, 'Swimming');
    assert.equal(brief.flights, 'yes');
    assert.equal(brief.intlFlights, 'not-included');
    assert.equal(brief.visa, 'exempt');
    assert.equal(brief.firstTime, 'yes');
    assert.equal(brief.interestsText, 'Culture, food');
    assert.equal(brief.avoid, 'Crowded markets');
    assert.equal(brief.specialRequests, 'Anniversary trip');
    assert.equal(brief.hotelTier, 'Boutique 4★');
    assert.equal(brief.budgetRange, '$3,000/pax');
    assert.equal(brief.travelMonth, 'Nov');
    assert.equal(brief.salesperson, 'Tai Pham');
  });
});
