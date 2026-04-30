import {
    CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY, type AuthUserPayload } from './auth.decorators.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwt: JwtService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (isPublic) return true;

        const req = ctx.switchToHttp().getRequest();
        const auth: string | undefined = req.headers?.authorization;
        if (!auth?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token ausente');
        }
        const token = auth.slice(7).trim();
        try {
            const payload = await this.jwt.verifyAsync<AuthUserPayload>(token);
            req.user = payload;
            return true;
        } catch {
            throw new UnauthorizedException('Token inválido');
        }
    }
}
