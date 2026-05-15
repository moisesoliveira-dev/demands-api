import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Permission } from './permissions.js';

export const PERMISSIONS_KEY = 'required_permissions';
export const PUBLIC_KEY = 'is_public';

export const RequirePermissions = (...permissions: Permission[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

export const Public = () => SetMetadata(PUBLIC_KEY, true);

export interface AuthUserPayload {
    sub: string;
    usua_id: number;
    usua_login: string;
    usua_nome: string;
    usua_email: string;
    nome: string;
    email: string;
    role: import('./permissions.js').Role;
    customPermissions?: Permission[];
}

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
        const req = ctx.switchToHttp().getRequest();
        return req.user;
    },
);
