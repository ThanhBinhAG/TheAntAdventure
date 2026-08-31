import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Dev A read screens use BFF APIs (no browser hydrate helpers)', () => {
  const products = source('components/products/ProductsPage.tsx');
  const planner = source('components/pages/Planner.tsx');
  const attractions = source('components/pages/Attractions.tsx');
  const gallery = source('components/gallery/GalleryWorkspace.tsx');
  const pricing = source('components/pricing/PricingPage.tsx');
  const tourDesign = source('components/tour-design/TourDesignPage.tsx');

  assert.doesNotMatch(products, /ensureTablesLoaded|ensurePageBootLoaded|lib\/db\/hydrate/);
  assert.match(products, /getBffData<Product>\(/);
  assert.match(products, /api\/products\?code=/);
  assert.doesNotMatch(products, /\/api\/products\/all/);
  assert.doesNotMatch(products, /\/api\/products\/pricing\/all/);

  assert.match(planner, /getBffArray<Task>\('\/api\/planner\/all'/);
  assert.match(planner, /setTasks/);

  assert.match(attractions, /getBffArray<Attraction>\(`\/api\/attractions\/all/);
  assert.match(attractions, /setAttractions/);

  assert.match(gallery, /useGalleryPage/);
  assert.doesNotMatch(gallery, /ensureTablesLoaded|lib\/db\/hydrate/);
  assert.match(gallery, /getBffArray<Attraction>\('\/api\/attractions\/all'/);
  assert.match(gallery, /setAttractions/);

  assert.doesNotMatch(pricing, /ensureTablesLoaded|lib\/db\/hydrate/);
  assert.match(pricing, /useProductPage/);
  assert.match(pricing, /\/api\/products\/pricing\?productCode=/);
  assert.doesNotMatch(pricing, /\/api\/products\/all/);
  assert.doesNotMatch(pricing, /\/api\/products\/pricing\/all/);

  assert.doesNotMatch(tourDesign, /ensureTablesLoaded|lib\/db\/hydrate/);
  assert.match(tourDesign, /\/api\/tour-design\/drafts\?leadIds=/);
  assert.match(tourDesign, /\/api\/tour-design\/drafts\?id=/);
  assert.match(tourDesign, /\/api\/tour-design\/outlines\?draftId=/);
  assert.doesNotMatch(tourDesign, /\/api\/products\/all/);
  assert.doesNotMatch(tourDesign, /\/api\/tour-design\/drafts\/all/);
  assert.doesNotMatch(tourDesign, /\/api\/tour-design\/outlines\/all/);
  assert.match(tourDesign, /getBffArray<GalleryPhoto>\('\/api\/photos\/all'/);
  assert.match(tourDesign, /useTourDesignCrmContext/);
  assert.match(tourDesign, /useTourDesignReferenceData/);
  assert.match(tourDesign, /\/api\/tour-design\/outline-workflow/);
});
