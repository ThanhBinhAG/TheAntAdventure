import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { contractUpdateRequestSchema } from '@/lib/contracts/contract-input';
import {
  ContractRepositoryError,
  getContractByIdServer,
  updateContractServer,
  deleteContractServer,
} from '@/lib/contracts/contract-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'contracts', route: '/api/contracts/[id]' },
      requiredPermission: 'contracts.read',
    },
    async ({ supabase }) => {
      try {
        return await getContractByIdServer(supabase, id);
      } catch (error) {
        if (error instanceof ContractRepositoryError && error.code === 'not_found') {
          return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
        }
        throw error;
      }
    },
  )(request);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'contracts', route: '/api/contracts/[id]' },
      requiredPermission: 'contracts.write',
      bodySchema: contractUpdateRequestSchema,
    },
    async ({ supabase, body }) => {
      if (body.contract.id !== id) {
        return NextResponse.json(
          { ok: false, error: 'Contract id trong URL và body không khớp.' },
          { status: 400 },
        );
      }
      try {
        return await updateContractServer(supabase, body.contract);
      } catch (error) {
        if (error instanceof ContractRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(request);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'contracts', route: '/api/contracts/[id]' },
      requiredPermission: 'contracts.write',
    },
    async ({ supabase }) => {
      try {
        await deleteContractServer(supabase, id);
        return { ok: true };
      } catch (error) {
        if (error instanceof ContractRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(request);
}
