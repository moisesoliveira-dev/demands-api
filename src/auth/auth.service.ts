import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { toUser, type UserRecord } from '../prisma/mappers.js';
import { resolvePermissions, type Permission } from '../common/permissions.js';

export interface PublicUser {
    id: string;
    nome: string;
    email: string;
    cargo: string;
    setor: string;
    role: UserRecord['role'];
    customPermissions?: Permission[];
    avatar?: string;
    avatarUrl?: string;
    ativo: boolean;
    criadoEm: string;
    ultimoAcesso?: string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) { }

    toPublic(u: UserRecord): PublicUser {
        const { senhaHash: _s, ...rest } = u;
        return rest;
    }

    async login(email: string, senha: string) {
        const row = await this.prisma.user.findFirst({
            where: { email: { equals: email.toLowerCase() } },
        });
        if (!row || !row.ativo) throw new UnauthorizedException('Credenciais inválidas');

        const ok = await bcrypt.compare(senha, row.senhaHash);
        if (!ok) throw new UnauthorizedException('Credenciais inválidas');

        const updated = await this.prisma.user.update({
            where: { id: row.id },
            data: { ultimoAcesso: new Date() },
        });
        const user = toUser(updated);

        const token = await this.jwt.signAsync({
            sub: user.id,
            nome: user.nome,
            email: user.email,
            role: user.role,
            customPermissions: user.customPermissions ?? [],
        });

        const publicUser = this.toPublic(user);
        const permissions = resolvePermissions(user.role, user.customPermissions ?? []);
        return { token, user: publicUser, permissions };
    }

    async me(userId: string) {
        const row = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!row) throw new UnauthorizedException('Usuário não encontrado');
        const u = toUser(row);
        return {
            user: this.toPublic(u),
            permissions: resolvePermissions(u.role, u.customPermissions ?? []),
        };
    }
}
