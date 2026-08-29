import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, type AuthContext } from '@/lib/auth/session';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import type { PermissionCode } from '@/lib/auth/permissions';
import {
  createHttpRequestLogger,
  type HttpLogContext,
  type HttpRequestLogger,
} from '@/lib/system/server-logger';
import type { SupabaseClient } from '@supabase/supabase-js';

export type BffRequestContext<TQuery = unknown, TBody = unknown> = {
  request: NextRequest;
  auth: AuthContext;
  supabase: SupabaseClient;
  logger: HttpRequestLogger['logger'];
  query: TQuery;
  body: TBody;
};

export type BffRouteOptions<TQuery extends z.ZodTypeAny, TBody extends z.ZodTypeAny> = {
  logging: Pick<HttpLogContext, 'scope' | 'route'>;
  requiredPermission?: PermissionCode;
  querySchema?: TQuery;
  bodySchema?: TBody;
};

/**
 * Wrapper chuẩn hóa cho các API Route Handlers ở BFF.
 * Tự động xác thực, phân quyền, validate input bằng Zod, và inject server-only Supabase client.
 */
export function bffRoute<
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
>(
  options: BffRouteOptions<TQuery, TBody>,
  handler: (ctx: BffRequestContext<z.infer<TQuery>, z.infer<TBody>>) => Promise<NextResponse | Response | unknown>
) {
  return async (request: Request) => {
    const requestLog = createHttpRequestLogger(request, options.logging);
    let actorId: string | undefined;
    const complete = (response: Response) => requestLog.completeResponse(response, { actorId });

    try {
      const nextRequest = new NextRequest(request);
      // 1. Xác thực một lần, sau đó lazily tạo một user-scoped client cho quyền/handler.
      const auth = await getAuthContext();
      if (!auth.authenticated) {
        if (auth.authenticationUnavailable) {
          return complete(NextResponse.json(
            { ok: false, error: 'Dịch vụ xác thực tạm thời không khả dụng.' },
            { status: 503, headers: { 'Retry-After': '30' } },
          ));
        }
        return complete(NextResponse.json(
          { ok: false, error: 'Chưa đăng nhập hoặc session đã hết hạn.' },
          { status: 401 },
        ));
      }
      actorId = auth.userId ?? undefined;
      let supabase: SupabaseClient | undefined;
      const getSupabaseClient = async () => {
        if (!supabase) supabase = await getServerSupabaseClient(auth);
        return supabase;
      };

      // 2. Phân quyền. Cache hit không cần tạo client trước; cache miss dùng đúng
      // client mà handler sẽ nhận, tránh xác minh Supabase JWT lặp lại.
      if (options.requiredPermission) {
        const permission = await checkPermissionForRequest(options.requiredPermission, {
          auth,
          getSupabaseClient,
        });
        if (!permission.allowed) {
          const errorMsg =
            permission.status === 401
              ? 'Chưa đăng nhập hoặc session đã hết hạn.'
              : `Bạn không có quyền thực hiện hành động này (Yêu cầu: ${options.requiredPermission}).`;
          return complete(NextResponse.json({ ok: false, error: errorMsg }, { status: permission.status }));
        }
      }

      // 3. Tái sử dụng client đã tạo khi permission cache miss, hoặc tạo một lần cho handler.
      const handlerSupabase = await getSupabaseClient();

      // 4. Validate query parameters (nếu có schema)
      let queryData: z.infer<TQuery> | undefined = undefined;
      if (options.querySchema) {
        const url = new URL(request.url);
        const queryObj: Record<string, string | string[]> = {};
        
        url.searchParams.forEach((value, key) => {
          if (key in queryObj) {
            const existing = queryObj[key];
            if (Array.isArray(existing)) {
              existing.push(value);
            } else {
              queryObj[key] = [existing, value];
            }
          } else {
            queryObj[key] = value;
          }
        });

        const parsedQuery = options.querySchema.safeParse(queryObj);
        if (!parsedQuery.success) {
          return complete(NextResponse.json(
            {
              ok: false,
              error: 'Tham số truy vấn không hợp lệ.',
              details: parsedQuery.error.format(),
            },
            { status: 400 }
          ));
        }
        queryData = parsedQuery.data;
      }

      // 5. Validate JSON body (nếu có schema)
      let bodyData: z.infer<TBody> | undefined = undefined;
      if (options.bodySchema) {
        let bodyObj: unknown;
        try {
          bodyObj = await nextRequest.json();
        } catch {
          return complete(NextResponse.json(
            { ok: false, error: 'Yêu cầu phải có body dạng JSON.' },
            { status: 400 }
          ));
        }

        const parsedBody = options.bodySchema.safeParse(bodyObj);
        if (!parsedBody.success) {
          return complete(NextResponse.json(
            {
              ok: false,
              error: 'Dữ liệu yêu cầu không hợp lệ.',
              details: parsedBody.error.format(),
            },
            { status: 422 }
          ));
        }
        bodyData = parsedBody.data;
      }

      const result = await handler({
        request: nextRequest,
        auth,
        supabase: handlerSupabase,
        logger: requestLog.logger,
        query: queryData as z.infer<TQuery>,
        body: bodyData as z.infer<TBody>,
      });

      // Nếu handler trả về Response/NextResponse trực tiếp thì chuyển tiếp thẳng
      if (result instanceof NextResponse || result instanceof Response) {
        return complete(result);
      }

      // Ngược lại, bọc kết quả thành công trong cấu trúc chuẩn
      return complete(NextResponse.json({ ok: true, data: result }));

    } catch (error) {
      requestLog.logger.error({ event: 'bff.request.failed', err: error }, 'BFF request failed');
      const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra trên server.';
      return complete(NextResponse.json({ ok: false, error: message }, { status: 500 }));
    }
  };
}
