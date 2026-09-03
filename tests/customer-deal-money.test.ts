import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  customerListActiveValue,
  formToCustomer,
  withAutoProfit,
  type CustomerFormData,
  EMPTY_CUSTOMER_FORM,
} from '../lib/customers/customer-form';
import {
  filterDashboardCustomers,
  sumCustomerRevenue,
  computeDashboardMetrics,
} from '../lib/dashboard/dashboard-metrics';
import type { Customer } from '../lib/types';

function baseForm(overrides: Partial<CustomerFormData> = {}): CustomerFormData {
  return { ...EMPTY_CUSTOMER_FORM, name: 'Ada', email: 'ada@example.com', ...overrides };
}

describe('customer deal money form', () => {
  it('auto-computes profit as revenue − cost', () => {
    const synced = withAutoProfit(baseForm({ revenue: '10000', cost: '3500' }));
    assert.equal(synced.profit, '6500');
  });

  it('clears profit when both revenue and cost are empty', () => {
    const synced = withAutoProfit(baseForm({ revenue: '', cost: '', profit: '99' }));
    assert.equal(synced.profit, '');
  });

  it('maps form money into customer numbers', () => {
    const customer = formToCustomer(
      baseForm({ revenue: '12000', cost: '4000' }),
      'CUS-1',
    );
    assert.equal(customer.revenue, 12000);
    assert.equal(customer.cost, 4000);
    assert.equal(customer.profit, 8000);
  });

  it('omits money when form fields are blank', () => {
    const customer = formToCustomer(baseForm(), 'CUS-2');
    assert.equal(customer.revenue, undefined);
    assert.equal(customer.cost, undefined);
    assert.equal(customer.profit, undefined);
  });
});

describe('customerListActiveValue', () => {
  it('prefers revenue over pipeline when revenue > 0', () => {
    assert.equal(customerListActiveValue(5000, 1200), 5000);
  });

  it('falls back to pipeline value', () => {
    assert.equal(customerListActiveValue(undefined, 1200), 1200);
    assert.equal(customerListActiveValue(0, 800), 800);
  });

  it('returns 0 when both empty', () => {
    assert.equal(customerListActiveValue(undefined, 0), 0);
  });
});

describe('dashboard customer revenue', () => {
  const customers: Customer[] = [
    {
      id: 'CUS-1',
      name: 'A',
      email: 'a@x.com',
      phone: '',
      country: 'USA',
      nat: 'USA',
      source: 'Direct',
      style: 'Luxury',
      lang: 'English',
      notes: '',
      bookings: [],
      clientType: 'b2c',
      revenue: 3000,
    },
    {
      id: 'CUS-2',
      name: 'B',
      email: 'b@x.com',
      phone: '',
      country: 'Japan',
      nat: 'Japan',
      source: 'Direct',
      style: 'Luxury',
      lang: 'English',
      notes: '',
      bookings: [],
      clientType: 'b2b',
      revenue: 7000,
    },
  ];

  it('sums and filters customer revenue', () => {
    assert.equal(sumCustomerRevenue(customers), 10000);
    assert.equal(
      sumCustomerRevenue(filterDashboardCustomers(customers, { clientType: 'b2c', market: '' })),
      3000,
    );
    assert.equal(
      sumCustomerRevenue(filterDashboardCustomers(customers, { clientType: '', market: 'Japan' })),
      7000,
    );
  });

  it('adds filtered customer revenue into realized', () => {
    const metrics = computeDashboardMetrics([], [], customers, [], {
      clientType: '',
      market: '',
    });
    assert.equal(metrics.realized, 10000);
    assert.ok(metrics.ytdPct > 0);
  });
});
