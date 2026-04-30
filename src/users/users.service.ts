import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { serializeCustomPermissions, toUser, type UserRecord } from '../prisma/mappers.js';
import type { CreateUserDto, UpdateUserDto } from './dto/users.dto.js';

function toPublic(u: UserRecord) {
    const { senhaHash: _s, ...rest } = u;
    return rest;
}

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async list() {
        const rows = await this.prisma.user.findMany({ orderBy: { criadoEm: 'asc' } });
        return rows.map((r) => toPublic(toUser(r)));
    }

    async byId(id: string) {
        const row = await this.prisma.user.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Usuário não encontrado');
        return toPublic(toUser(row));
    }

    async create(input: CreateUserDto) {
        const dup = await this.prisma.user.findFirst({
            where: { email: { equals: input.email.toLowerCase() } },
        });
        if (dup) throw new ConflictException('Já existe um usuário com este email');
        const created = await this.prisma.user.create({
            data: {
                nome: input.nome,
                email: input.email.toLowerCase(),
                senhaHash: await bcrypt.hash(input.senha, 10),
                cargo: input.cargo,
                setor: input.setor,
                role: input.role,
                customPermissions: serializeCustomPermissions(input.customPermissions),
                ativo: true,
            },
        });
        return toPublic(toUser(created));
    }

    async update(id: string, input: UpdateUserDto) {
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Usuário não encontrado');
        if (input.email) {
            const dup = await this.prisma.user.findFirst({
                where: { email: { equals: input.email.toLowerCase() }, NOT: { id } },
            });
            if (dup) throw new ConflictException('Já existe um usuário com este email');
        }
        const updated = await this.prisma.user.update({
            where: { id },
            data: {
                ...(input.nome !== undefined && { nome: input.nome }),
                ...(input.email !== undefined && { email: input.email.toLowerCase() }),
                ...(input.cargo !== undefined && { cargo: input.cargo }),
                ...(input.setor !== undefined && { setor: input.setor }),
                ...(input.role !== undefined && { role: input.role }),
                ...(input.customPermissions !== undefined && {
                    customPermissions: serializeCustomPermissions(input.customPermissions),
                }),
                ...(input.ativo !== undefined && { ativo: input.ativo }),
            },
        });
        return toPublic(toUser(updated));
    }

    async remove(id: string) {
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Usuário não encontrado');
        await this.prisma.user.delete({ where: { id } });
    }
}
