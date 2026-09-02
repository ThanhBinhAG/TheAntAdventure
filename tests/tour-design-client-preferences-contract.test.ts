import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Tour Design gets Travel Style and Hotel Tier from the same active catalogs as Clients', () => {
  const root = process.cwd();
  const brief = readFileSync(join(root, 'components/tour-design/ClientBriefStep.tsx'), 'utf8');
  const page = readFileSync(join(root, 'components/tour-design/TourDesignPage.tsx'), 'utf8');
  const routePath = join(root, 'app/api/tour-design/client-preferences/route.ts');

  assert.equal(existsSync(routePath), true);
  const route = readFileSync(routePath, 'utf8');
  assert.match(route, /requiredPermission: 'tour_design\.read'/);
  assert.match(route, /listTravelStylesServer/);
  assert.match(route, /listActiveHotelTiersServer/);
  assert.match(brief, /\/api\/tour-design\/client-preferences/);
  assert.match(brief, /travelStyles\.filter\(\(style\) => style\.isActive\)/);
  assert.match(brief, /selectableHotelTiers\.map/);
  assert.match(brief, /TravelStyleManagerModal/);
  assert.match(brief, /Manage Travel Styles/);
  assert.match(brief, /canManageTravelStyles/);
  assert.match(page, /usePagePermission\('customers'\)/);
  assert.doesNotMatch(brief, /<option>Boutique 4★<\/option>/);
  assert.doesNotMatch(brief, /\['Luxury', 'Premium Cultural'/);
});
