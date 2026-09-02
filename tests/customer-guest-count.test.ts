import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { EMPTY_CUSTOMER_FORM } from '@/lib/customers/customer-form';
import { customerFormFieldsSchema } from '@/lib/customers/customer-list-input';
import { buildInquiryLead } from '@/lib/customers/customer-onboarding';
import { isValidGuestCount } from '@/lib/customers/customer-validation';
import type { Customer } from '@/lib/types';

test('accepts only whole guest counts from 1 to 9999', () => {
  for (const value of ['1', '25', '120', '9999']) assert.equal(isValidGuestCount(value), true);
  for (const value of ['', '0', '-1', '1.5', '1e2', '10000', 'twelve']) assert.equal(isValidGuestCount(value), false);
});

test('Customer BFF rejects an invalid guest count', () => {
  const base = { ...EMPTY_CUSTOMER_FORM, name: 'Guest Test', email: 'guest@test.com' };
  assert.equal(customerFormFieldsSchema.safeParse({ ...base, adults: '120' }).success, true);
  assert.equal(customerFormFieldsSchema.safeParse({ ...base, adults: '1.5' }).success, false);
  assert.equal(customerFormFieldsSchema.safeParse({ ...base, adults: '10000' }).success, false);
});

test('Customer form uses a numeric field and a created Lead receives the exact guest count', () => {
  const source = readFileSync(join(process.cwd(), 'components/customers/CustomerFormModal.tsx'), 'utf8');
  assert.match(source, /id={fieldDomId\('adults'\)}/);
  assert.match(source, /type="number"/);
  assert.match(source, /max="9999"/);

  const form = { ...EMPTY_CUSTOMER_FORM, adults: '120' };
  const lead = buildInquiryLead({ id: 'CUS-001' } as Customer, form, 'LD-001');
  assert.equal(lead.pax, 120);
});
