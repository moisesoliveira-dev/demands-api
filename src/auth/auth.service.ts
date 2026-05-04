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

    async atualizarMeuPerfil(
        userId: string,
        input: { nome?: string; email?: string; cargo?: string; avatar?: string; avatarUrl?: string },
    ): Promise<PublicUser> {
        const row = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!row) throw new UnauthorizedException('Usuário não encontrado');

        if (input.email && input.email.toLowerCase() !== row.email.toLowerCase()) {
            const existing = await this.prisma.user.findFirst({
                where: { email: input.email.toLowerCase(), NOT: { id: userId } },
            });
            if (existing) throw new UnauthorizedException('E-mail já está em uso');
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(input.nome !== undefined && { nome: input.nome }),
                ...(input.email !== undefined && { email: input.email.toLowerCase() }),
                ...(input.cargo !== undefined && { cargo: input.cargo }),
                ...(input.avatar !== undefined && { avatar: input.avatar }),
                ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
            },
        });
        return this.toPublic(toUser(updated));
    }

    async alterarSenha(userId: string, senhaAtual: string, novaSenha: string): Promise<void> {
        const row = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!row) throw new UnauthorizedException('Usuário não encontrado');

        const ok = await bcrypt.compare(senhaAtual, row.senhaHash);
        if (!ok) throw new UnauthorizedException('Senha atual inválida');

        const novoHash = await bcrypt.hash(novaSenha, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { senhaHash: novoHash },
        });
    }
}
