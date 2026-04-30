import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toSetor, type SetorRecord } from '../prisma/mappers.js';
import type { CreateSetorDto, UpdateSetorDto } from './dto/setores.dto.js';

@Injectable()
export class SetoresService {
    constructor(private readonly prisma: PrismaService) { }

    async list(): Promise<SetorRecord[]> {
        const rows = await this.prisma.setor.findMany({ orderBy: { criadoEm: 'asc' } });
        return rows.map(toSetor);
    }

    async byId(id: string): Promise<SetorRecord> {
        const row = await this.prisma.setor.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Setor não encontrado');
        return toSetor(row);
    }

    async create(input: CreateSetorDto): Promise<SetorRecord> {
        const dup = await this.prisma.setor.findFirst({
            where: { nome: { equals: input.nome } },
        });
        if (dup) throw new ConflictException('Já existe um setor com este nome');
        const created = await this.prisma.setor.create({
            data: {
                nome: input.nome,
                descricao: input.descricao ?? '',
                responsavel: input.responsavel,
                ativo: input.ativo ?? true,
            },
        });
        return toSetor(created);
    }

    async update(id: string, input: UpdateSetorDto): Promise<SetorRecord> {
        const existing = await this.prisma.setor.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Setor não encontrado');
        if (input.nome) {
            const dup = await this.prisma.setor.findFirst({
                where: { nome: { equals: input.nome }, NOT: { id } },
            });
            if (dup) throw new ConflictException('Já existe um setor com este nome');
        }
        const updated = await this.prisma.setor.update({
            where: { id },
            data: {
                ...(input.nome !== undefined && { nome: input.nome }),
                ...(input.descricao !== undefined && { descricao: input.descricao }),
                ...(input.responsavel !== undefined && { responsavel: input.responsavel }),
                ...(input.ativo !== undefined && { ativo: input.ativo }),
            },
        });
        return toSetor(updated);
    }

    async remove(id: string) {
        const existing = await this.prisma.setor.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Setor não encontrado');
        await this.prisma.setor.delete({ where: { id } });
    }
}
