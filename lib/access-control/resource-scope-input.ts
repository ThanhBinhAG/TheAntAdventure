/** Request contract for role-level RLS data scopes. */
import { z } from 'zod';
import { accessControlRoleCodeSchema } from './role-input';

export const resourceScopeResourceCodeSchema = z.enum([
    'customers',
    'leads',
    'tour_drafts',
    'bookings',
    'tasks',
    'comms',
]);

export const resourceScopeActionSchema = z.enum([
    'read',
    'write',
    'delete',
]);

export const resourceScopeScopeSchema = z.enum([
    'own',
    'all',
]);

export const accessControlResourceScopeSchema = z.object({
    resourceCode: resourceScopeResourceCodeSchema,
    action: resourceScopeActionSchema,
    scope: resourceScopeScopeSchema,
});

export const replaceAccessControlStaffRoleScopesBodySchema = z.object({
    action: z.literal('replace_role_resource_scopes'),
    roleCode: accessControlRoleCodeSchema,
    scopes: z.array(accessControlResourceScopeSchema)
        .max(18)
        .superRefine((scopes, context) => {
            const seen = new Set<string>();

            scopes.forEach((scope, index) => {
                const key = `${scope.resourceCode}:${scope.action}`;

                if (seen.has(key)) {
                    context.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [index],
                        message: 'Mỗi resource chỉ có một scope cho mỗi action.',
                    });
                }

                seen.add(key);
            });
        }),
});
