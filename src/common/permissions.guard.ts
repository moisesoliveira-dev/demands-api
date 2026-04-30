import {
    CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, type AuthUserPayload } from './auth.decorators.js';
import { resolvePermissions, type Permission } from './permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(ctx: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<Permission[]>(
            PERMISSIONS_KEY,
            [ctx.getHandler(), ctx.getClass()],
        );
        if (!required?.length) return true;

        const req = ctx.switchToHttp().getRequest();
        const user: AuthUserPayload | undefined = req.user;
        if (!user) throw new ForbiddenException('Não autenticado');

        const granted = resolvePermissions(user.role, user.customPermissions ?? []);
        const ok = required.every((p) => granted.includes(p));
        if (!ok) throw new ForbiddenException('Permissão insuficiente');
        return true;
    }
}
