import { expect, test } from '@playwright/test';
import { assertRow, browserJson, login, readE2eState } from './support';

const AUTHZ_PATHS = [
  '/api/customers?page=1&pageSize=12',
  '/api/agents?page=1&pageSize=12',
  '/api/leads?page=1&pageSize=12',
  '/api/photos?page=1&pageSize=12',
  '/api/bookings',
  '/api/contracts',
  '/api/dashboard',
  '/api/weather/boot',
] as const;

test.describe.serial('Dev B domain acceptance', () => {
  test('Dev B APIs enforce unauthenticated and forbidden access', async ({ page }) => {
    await page.goto('/login');
    for (const path of AUTHZ_PATHS) {
      expect((await browserJson(page, path)).status, path).toBe(401);
    }

    const state = await readE2eState();
    await login(page, state.unassigned);
    for (const path of AUTHZ_PATHS) {
      expect((await browserJson(page, path)).status, path).toBe(403);
    }
  });

  test('Clients CRUD, validation, and profile inquiry/comms', async ({ page }) => {
    const state = await readE2eState();
    const email = `${state.prefix.toLowerCase()}-client@example.test`;
    await login(page, state.admin);

    const create = await browserJson(page, '/api/customers', {
      method: 'POST',
      body: {
        form: {
          name: `${state.prefix} Client`,
          email,
          phone: '',
          country: 'Vietnam',
          nat: '',
          source: 'Web',
          style: 'Comfort',
          lang: 'EN',
          notes: '',
          clientType: 'b2c',
          agentName: '',
          salesperson: '',
          whatsapp: '',
          hotelTier: '',
          budget: '',
          travelMonth: '',
          adults: '2',
          firstTime: '',
          flights: 'yes',
          intlFlights: '',
          visaStatus: '',
          interests: '',
          donts: '',
          numChildren: '0',
          childAges: '',
          childDiet: '',
          childPrefs: '',
        },
        createLead: false,
        logInquiry: false,
        flagTourDesign: false,
      },
    });
    expect(create.status).toBe(201);
    const customerId = (create.body as { customer?: { id?: string } })?.customer?.id;
    expect(customerId).toBeTruthy();
    expect((await assertRow('customers', 'id', customerId!))?.name).toBe(`${state.prefix} Client`);

    expect(
      (
        await browserJson(page, '/api/customers', {
          method: 'POST',
          body: { form: { name: '' } },
        })
      ).status,
    ).toBe(400);

    const patch = await browserJson(page, `/api/customers/${customerId}`, {
      method: 'PATCH',
      body: { notes: `${state.prefix} notes` },
    });
    expect(patch.status).toBe(200);
    expect((await assertRow('customers', 'id', customerId!))?.notes).toBe(`${state.prefix} notes`);

    const inquiry = await browserJson(page, `/api/customers/${state.customerId}/inquiry`, {
      method: 'POST',
      body: { flagTourDesign: false },
    });
    expect(inquiry.status).toBe(200);

    const comms = await browserJson(page, `/api/customers/${state.customerId}/comms`, {
      method: 'POST',
      body: {
        type: 'Email',
        dir: 'outbound',
        date: '2026-08-25',
        subj: `${state.prefix} follow-up`,
        body: '',
      },
    });
    expect(comms.status).toBe(200);

    expect((await browserJson(page, `/api/customers/${customerId}`, { method: 'DELETE' })).status).toBe(200);
    expect(await assertRow('customers', 'id', customerId!)).toBeNull();
  });

  test('Agents CRUD and validation', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);

    const create = await browserJson(page, '/api/agents', {
      method: 'POST',
      body: {
        form: {
          name: `${state.prefix} Agent`,
          country: 'USA',
          tier: 'Bronze',
          commissionPct: 8,
          currency: 'USD',
          contactName: 'E2E',
          email: `${state.prefix.toLowerCase()}-agent@example.test`,
          phone: '',
          notes: '',
          status: 'Active',
        },
      },
    });
    expect(create.status).toBe(201);
    const agentId = (create.body as { agent?: { id?: string } })?.agent?.id;
    expect(agentId).toBeTruthy();
    expect((await assertRow('agents', 'id', agentId!))?.name).toBe(`${state.prefix} Agent`);

    expect(
      (
        await browserJson(page, '/api/agents', {
          method: 'POST',
          body: { form: { name: '' } },
        })
      ).status,
    ).toBe(400);

    const patch = await browserJson(page, `/api/agents/${agentId}`, {
      method: 'PATCH',
      body: {
        form: {
          name: `${state.prefix} Agent Updated`,
          country: 'USA',
          tier: 'Gold',
          commissionPct: 12,
          currency: 'USD',
          contactName: 'E2E',
          email: `${state.prefix.toLowerCase()}-agent@example.test`,
          phone: '',
          notes: '',
          status: 'Active',
        },
      },
    });
    expect(patch.status).toBe(200);
    expect((await assertRow('agents', 'id', agentId!))?.name).toBe(`${state.prefix} Agent Updated`);

    expect((await browserJson(page, `/api/agents/${agentId}`, { method: 'DELETE' })).status).toBe(200);
    expect(await assertRow('agents', 'id', agentId!)).toBeNull();
  });

  test('Bookings CRUD and validation', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);

    const create = await browserJson(page, '/api/bookings', {
      method: 'POST',
      body: {
        booking: {
          custId: state.customerId,
          tour: `${state.prefix} North Classic`,
          pax: 2,
          start: '2026-10-01',
          end: '2026-10-10',
          total: 1200,
          deposit: 400,
          status: 'Confirmed',
        },
      },
    });
    expect(create.status).toBe(200);
    const bookingId = (create.body as { data?: { id?: string } })?.data?.id;
    expect(bookingId).toBeTruthy();
    expect((await assertRow('bookings', 'id', bookingId!))?.tour).toBe(`${state.prefix} North Classic`);

    expect(
      (
        await browserJson(page, '/api/bookings', {
          method: 'POST',
          body: { booking: { custId: '', tour: 'Invalid' } },
        })
      ).status,
    ).toBe(422);

    const patch = await browserJson(page, `/api/bookings/${bookingId}`, {
      method: 'PATCH',
      body: {
        booking: {
          id: bookingId,
          custId: state.customerId,
          tour: `${state.prefix} North Classic Updated`,
          pax: 3,
          start: '2026-10-01',
          end: '2026-10-10',
          total: 1500,
          deposit: 400,
          status: 'On Tour',
        },
      },
    });
    expect(patch.status).toBe(200);
    expect((await assertRow('bookings', 'id', bookingId!))?.tour).toBe(`${state.prefix} North Classic Updated`);
  });

  test('Contracts CRUD and validation', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);

    const create = await browserJson(page, '/api/contracts', {
      method: 'POST',
      body: {
        contract: {
          clientName: `${state.prefix} Guest`,
          tourName: `${state.prefix} Contract Tour`,
          pax: 2,
          total: 1000,
          depositPct: 30,
        },
      },
    });
    expect(create.status).toBe(200);
    const contractId = (create.body as { data?: { id?: string } })?.data?.id;
    expect(contractId).toBeTruthy();
    expect((await assertRow('contracts', 'id', contractId!))?.client_name).toBe(`${state.prefix} Guest`);

    expect(
      (
        await browserJson(page, '/api/contracts', {
          method: 'POST',
          body: { contract: { clientName: '', tourName: 'Invalid' } },
        })
      ).status,
    ).toBe(422);

    const patch = await browserJson(page, `/api/contracts/${contractId}`, {
      method: 'PATCH',
      body: {
        contract: {
          id: contractId,
          clientName: `${state.prefix} Guest`,
          tourName: `${state.prefix} Contract Tour Updated`,
          pax: 4,
          status: 'Signed',
          total: 1200,
          depositPct: 30,
          signedAt: '2026-08-30',
        },
      },
    });
    expect(patch.status).toBe(200);
    expect((await assertRow('contracts', 'id', contractId!))?.tour_name).toBe(
      `${state.prefix} Contract Tour Updated`,
    );

    const del = await browserJson(page, `/api/contracts/${contractId}`, { method: 'DELETE' });
    expect(del.status).toBe(200);
    expect(await assertRow('contracts', 'id', contractId!)).toBeNull();
  });

  test('Sales lead stage patch', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);

    const before = await assertRow('leads', 'id', state.leadId);
    expect(before).not.toBeNull();

    const patch = await browserJson(page, `/api/leads/${state.leadId}`, {
      method: 'PATCH',
      body: { stage: 'Quoted' },
    });
    expect(patch.status).toBe(200);
    expect((await assertRow('leads', 'id', state.leadId))?.stage).toBe('Quoted');

    expect(
      (
        await browserJson(page, `/api/leads/${state.leadId}`, {
          method: 'PATCH',
          body: {},
        })
      ).status,
    ).toBe(400);

    // Restore a non-terminal stage for teardown-friendly leftover seed.
    expect(
      (
        await browserJson(page, `/api/leads/${state.leadId}`, {
          method: 'PATCH',
          body: { stage: 'Inquiry' },
        })
      ).status,
    ).toBe(200);
  });

  test('Gallery list and folder create/delete', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);

    expect((await browserJson(page, '/api/photo-folders')).status).toBe(200);
    expect((await browserJson(page, '/api/photos/all')).status).toBe(200);

    const create = await browserJson(page, '/api/photo-folders', {
      method: 'POST',
      body: { name: `${state.prefix} Folder`, parentId: null },
    });
    expect(create.status).toBe(200);
    const id = (create.body as { folder?: { id?: string } })?.folder?.id;
    expect(id).toBeTruthy();
    expect((await assertRow('photo_folders', 'id', id!))?.name).toBe(`${state.prefix} Folder`);

    expect((await browserJson(page, `/api/photo-folders/${id}`, { method: 'DELETE' })).status).toBe(200);
    expect(await assertRow('photo_folders', 'id', id!)).toBeNull();
  });

  test('Weather boot and Dashboard aggregate', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);

    const weather = await browserJson(page, '/api/weather/boot');
    expect(weather.status).toBe(200);
    const weatherBody = weather.body as { destinations?: unknown; featuredWeather?: unknown };
    expect(Array.isArray(weatherBody.destinations) || weatherBody.destinations != null).toBe(true);

    const dashboard = await browserJson(page, '/api/dashboard');
    expect(dashboard.status).toBe(200);
    const dash = dashboard.body as Record<string, unknown>;
    for (const key of [
      'filters',
      'metrics',
      'forecastDeals',
      'forecastAllActiveValue',
      'forecastAllActiveWeighted',
      'agentPipeline',
      'totalEstCommission',
    ]) {
      expect(dash, key).toHaveProperty(key);
    }
  });
});
