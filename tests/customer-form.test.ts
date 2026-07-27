import assert from 'node:assert/strict';
import test from 'node:test';
import {
  customerToForm,
  EMPTY_CUSTOMER_FORM,
  formToCustomer,
  type CustomerFormData,
} from '../lib/customer-form';
import type { Customer } from '../lib/types';

const sampleCustomer: Customer = {
  id: 'CUS-26-001',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555',
  country: 'USA',
  nat: 'USA',
  source: 'Website',
  style: 'Adventure',
  lang: 'English',
  notes: 'VIP',
  bookings: ['BK-1'],
  clientType: 'b2b',
  agentName: 'Black Tomato',
  agentId: 'AGT-002',
  salesperson: 'Tai Pham',
  adults: 3,
  children: 1,
  childAges: '8',
  hotelTier: '5★',
  budget: '$5,000/pax',
  travelMonth: '2026-09',
  flights: 'yes',
  visaStatus: 'exempt',
};

test('EMPTY_CUSTOMER_FORM defaults to B2C', () => {
  assert.equal(EMPTY_CUSTOMER_FORM.clientType, 'b2c');
  assert.equal(EMPTY_CUSTOMER_FORM.adults, '2');
  assert.equal(EMPTY_CUSTOMER_FORM.numChildren, '0');
});

test('customerToForm round-trips core fields', () => {
  const form = customerToForm(sampleCustomer);
  assert.equal(form.name, 'Jane Doe');
  assert.equal(form.email, 'jane@example.com');
  assert.equal(form.clientType, 'b2b');
  assert.equal(form.agentName, 'Black Tomato');
  assert.equal(form.adults, '3');
  assert.equal(form.numChildren, '1');
  assert.equal(form.childAges, '8');
});

test('formToCustomer maps B2B agent and clears agent for B2C', () => {
  const form: CustomerFormData = {
    ...EMPTY_CUSTOMER_FORM,
    name: '  Alex  ',
    email: ' alex@ex.com ',
    phone: ' 1 ',
    clientType: 'b2b',
    agentName: 'Pelorus',
    adults: '4',
    numChildren: '2',
    notes: 'Hello',
  };
  const b2b = formToCustomer(form, 'CUS-26-010', [], 'AGT-003');
  assert.equal(b2b.name, 'Alex');
  assert.equal(b2b.email, 'alex@ex.com');
  assert.equal(b2b.agentName, 'Pelorus');
  assert.equal(b2b.agentId, 'AGT-003');
  assert.equal(b2b.adults, 4);
  assert.equal(b2b.children, 2);

  const b2c = formToCustomer({ ...form, clientType: 'b2c' }, 'CUS-26-011', ['BK-9'], 'AGT-003');
  assert.equal(b2c.agentName, undefined);
  assert.equal(b2c.agentId, undefined);
  assert.deepEqual(b2c.bookings, ['BK-9']);
});

test('formToCustomer appends children note when ages/prefs empty', () => {
  const form: CustomerFormData = {
    ...EMPTY_CUSTOMER_FORM,
    name: 'Pat',
    email: 'pat@ex.com',
    numChildren: '2',
    notes: 'Base',
  };
  const c = formToCustomer(form, 'CUS-26-012');
  assert.match(c.notes, /Children: 2/);
  assert.match(c.notes, /Base/);
});

test('customerToForm then formToCustomer preserves id and bookings', () => {
  const form = customerToForm(sampleCustomer);
  const back = formToCustomer(form, sampleCustomer.id, sampleCustomer.bookings, sampleCustomer.agentId);
  assert.equal(back.id, sampleCustomer.id);
  assert.equal(back.name, sampleCustomer.name);
  assert.deepEqual(back.bookings, ['BK-1']);
  assert.equal(back.agentId, 'AGT-002');
});
