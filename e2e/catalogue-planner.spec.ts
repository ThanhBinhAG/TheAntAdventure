import { expect, test } from '@playwright/test';
import { assertRow, browserJson, login, readE2eState } from './support';

test.describe.serial('Product, pricing, planner, and attraction acceptance', () => {
  test('Product CRUD, pricing update, and rejected import preserve existing data', async ({ page }) => {
    const state = await readE2eState();
    const code = `${state.prefix}-PRODUCT`;
    await login(page, state.admin);
    const product = { code, name: 'E2E Product', logic: '', dur: 'Full Day', cat: 'Experience', dest: 'Hanoi', lvl: 'Easy', desc: '', usp: '', price: '', region: 'north', photoIds: [], linkedPhotoIds: [] };
    expect((await browserJson(page, '/api/products', { method: 'POST', body: { product } })).status).toBe(200);
    expect((await assertRow('products', 'code', code))?.name).toBe('E2E Product');
    expect(await assertRow('product_pricing', 'product_code', code)).not.toBeNull();

    product.name = 'E2E Product Updated';
    expect((await browserJson(page, '/api/products', { method: 'PATCH', body: { product } })).status).toBe(200);
    expect((await browserJson(page, '/api/products/pricing', { method: 'PATCH', body: { pricing: { productCode: code, p1: 321, incl: {} } } })).status).toBe(200);
    expect((await assertRow('products', 'code', code))?.name).toBe('E2E Product Updated');
    expect(Number((await assertRow('product_pricing', 'product_code', code))?.p1)).toBe(321);

    expect((await browserJson(page, '/api/products/import', { method: 'POST', body: { drafts: 'not-an-array' } })).status).toBe(422);
    expect((await assertRow('products', 'code', code))?.name).toBe('E2E Product Updated');

    expect((await browserJson(page, '/api/products', { method: 'DELETE', body: { code } })).status).toBe(200);
    expect(await assertRow('products', 'code', code)).toBeNull();
  });

  test('Planner CRUD and validation failures affect only the intended task', async ({ page }) => {
    const state = await readE2eState();
    const id = `${state.prefix}-TASK`;
    await login(page, state.admin);
    const task = { id, title: 'E2E planner task', assignee: 'E2E', date: '2026-08-21', priority: 'medium', dept: 'Operations', status: 'todo', notes: '' };
    expect((await browserJson(page, '/api/planner', { method: 'POST', body: { task } })).status).toBe(200);
    expect((await assertRow('tasks', 'id', id))?.title).toBe(task.title);
    expect((await browserJson(page, '/api/planner', { method: 'PATCH', body: { id, patch: { status: 'done' } } })).status).toBe(200);
    expect((await assertRow('tasks', 'id', id))?.status).toBe('done');
    expect((await browserJson(page, '/api/planner', { method: 'POST', body: { task: { id: `${id}-BAD` } } })).status).toBe(422);
    expect(await assertRow('tasks', 'id', `${id}-BAD`)).toBeNull();
    expect((await browserJson(page, '/api/planner', { method: 'DELETE', body: { id } })).status).toBe(200);
    expect(await assertRow('tasks', 'id', id)).toBeNull();
  });

  test('Attraction region filter and rejected mutation keep database state consistent', async ({ page }) => {
    const state = await readE2eState();
    const northId = `${state.prefix}-ATTRACTION-N`;
    const centralId = `${state.prefix}-ATTRACTION-C`;
    await login(page, state.admin);
    const attraction = (id: string, region: 'north' | 'central') => ({ id, region, type: 'museum', name: `${region} E2E attraction`, dest: 'E2E destination', hours: '', closed: '', admission: '', duration: 1, best_time: '', crowd: '', book_req: false, seasonal: '', notes: '', alert: '', phone: '', photoIds: [], linkedPhotoIds: [] });
    expect((await browserJson(page, '/api/attractions', { method: 'POST', body: { attraction: attraction(northId, 'north') } })).status).toBe(200);
    expect((await browserJson(page, '/api/attractions', { method: 'POST', body: { attraction: attraction(centralId, 'central') } })).status).toBe(200);
    const northRows = await browserJson(page, '/api/attractions/all?region=north');
    expect(northRows.status).toBe(200);
    expect(JSON.stringify(northRows.body)).toContain(northId);
    expect(JSON.stringify(northRows.body)).not.toContain(centralId);
    expect((await browserJson(page, '/api/attractions', { method: 'POST', body: { attraction: { ...attraction(`${northId}-BAD`, 'north'), name: '' } } })).status).toBe(422);
    expect(await assertRow('attractions', 'id', `${northId}-BAD`)).toBeNull();
  });
});
