import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Customer Hotel Tier is sourced from active Hotels through a permissioned BFF endpoint', () => {
  const root = process.cwd();
  const customerForm = readFileSync(join(root, 'components/customers/CustomerFormModal.tsx'), 'utf8');
  const hotelForm = readFileSync(join(root, 'components/suppliers/HotelFormModal.tsx'), 'utf8');
  const route = join(root, 'app/api/customers/hotel-tiers/route.ts');

  assert.equal(existsSync(route), true);
  assert.match(readFileSync(route, 'utf8'), /requiredPermission: 'customers\.write'/);
  assert.match(customerForm, /\/api\/customers\/hotel-tiers/);
  assert.match(customerForm, /cache: 'no-store'/);
  assert.match(customerForm, /const selectableHotelTiers = useMemo/);
  assert.match(customerForm, /selectableHotelTiers\.map/);
  assert.match(hotelForm, /value={hotelTierChoice}/);
  assert.match(hotelForm, /value="__custom"/);
  assert.doesNotMatch(customerForm, /<option>Boutique 4★<\/option>/);
  assert.match(hotelForm, /await onSave\(\{/);
});
