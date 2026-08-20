import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Dev A read screens use BFF APIs instead of hydrate helpers', () => {
  const config = source('lib/db/sync-config.ts');
  const products = source('components/products/ProductsPage.tsx');
  const planner = source('components/pages/Planner.tsx');
  const attractions = source('components/pages/Attractions.tsx');
  const gallery = source('components/gallery/GalleryWorkspace.tsx');
  const pricing = source('components/pricing/PricingPage.tsx');
  const tourDesign = source('components/tour-design/TourDesignPage.tsx');
  const tourDesignBoot = config.match(/tourdesign:\s*\[([\s\S]*?)\],\n\s*\/\/ Catalogue/)?.[1] ?? '';

  assert.match(config, /planner:\s*\['cal_events'\]/);
  assert.match(config, /attractions:\s*\['photos', 'photo_folders'\]/);
  assert.match(config, /pricing:\s*\[\]/);
  assert.doesNotMatch(tourDesignBoot, /'products'/);
  assert.doesNotMatch(tourDesignBoot, /'tour_drafts'/);
  assert.doesNotMatch(tourDesignBoot, /'tour_outline_days'/);

  assert.doesNotMatch(products, /ensureTablesLoaded/);
  assert.match(products, /getBffArray<Product>\('\/api\/products\/all'/);
  assert.match(products, /getBffArray<ProductPricing>\('\/api\/products\/pricing\/all'/);

  assert.match(planner, /getBffArray<Task>\('\/api\/planner\/all'/);
  assert.match(planner, /setTasks/);

  assert.match(attractions, /getBffArray<Attraction>\(`\/api\/attractions\/all/);
  assert.match(attractions, /setAttractions/);

  assert.doesNotMatch(gallery, /ensureTablesLoaded\(\['attractions'\]\)/);
  assert.match(gallery, /getBffArray<Attraction>\('\/api\/attractions\/all'/);
  assert.match(gallery, /setAttractions/);

  assert.doesNotMatch(pricing, /ensureTablesLoaded/);
  assert.match(pricing, /getBffArray<Product>\('\/api\/products\/all'/);
  assert.match(pricing, /getBffArray<ProductPricing>\('\/api\/products\/pricing\/all'/);

  assert.doesNotMatch(tourDesign, /ensureTablesLoaded/);
  assert.match(tourDesign, /getBffArray<Product>\('\/api\/products\/all'/);
  assert.match(tourDesign, /getBffArray<TourDraft>\('\/api\/tour-design\/drafts\/all'/);
  assert.match(tourDesign, /getBffArray<TourOutlineDay>\('\/api\/tour-design\/outlines\/all'/);
  assert.match(tourDesign, /getBffArray<GalleryPhoto>\('\/api\/photos\/all'/);
});
