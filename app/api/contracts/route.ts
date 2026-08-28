import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { contractCreateRequestSchema } from '@/lib/contracts/contract-input';
import {
  ContractRepositoryError,
  createContractServer,
  listContractsServer,
} from '@/lib/contracts/contract-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'contracts', route: '/api/contracts' },
    requiredPermission: 'contracts.read',
  },
  async ({ supabase }) => listContractsServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'contracts', route: '/api/contracts' },
    requiredPermission: 'contracts.write',
    bodySchema: contractCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createContractServer(supabase, body.contract);
    } catch (error) {
      if (error instanceof ContractRepositoryError) {
        const status =
          error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);
