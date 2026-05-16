import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
    toDemanda, toHistorico,
    type DemandStatus, type DemandaRecord, type HistoricoAuditoria,
} from '../prisma/mappers.js';
import type { AuthUserPayload } from '../common/auth.decorators.js';
import type {
    CreateDemandaDto, ListDemandasQueryDto, UpdateDemandaDto, UpdateStatusDto,
} from './dto/demandas.dto.js';

function asArray(v: unknown): string[] | undefined {
    if (v == null) return undefined;
    if (Array.isArray(v)) return v.map(String);
    return String(v).split(',').filter(Boolean);
}

@Injectable()
export class DemandasService {
    constructor(private readonly prisma: PrismaService) { }

    async list(query: ListDemandasQueryDto = {}): Promise<DemandaRecord[]> {
        const status = asArray(query.status);
        const prioridade = asArray(query.prioridade)?.map((n) => Number(n));
        const setor = asArray(query.setor);
        const responsavel = asArray(query.responsavel);

        const where: Record<string, unknown> = {};
        if (status?.length) where['status'] = { in: status };
        if (prioridade?.length) where['prioridade'] = { in: prioridade };
        if (setor?.length) where['setor'] = { in: setor };
        if (responsavel?.length) where['responsavel'] = { in: responsavel };
        if (query.dataInicio || query.dataFim) {
            const range: Record<string, Date> = {};
            if (query.dataInicio) range['gte'] = new Date(query.dataInicio);
            if (query.dataFim) range['lte'] = new Date(query.dataFim);
            where['criadoEm'] = range;
        }
        if (query.busca) {
            const q = query.busca;
            where['OR'] = [
                { titulo: { contains: q } },
                { descricao: { contains: q } },
            ];
        }

        const rows = await this.prisma.demanda.findMany({
            where,
            orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }],
        });
        return rows.map(toDemanda);
    }

    async byId(id: string): Promise<DemandaRecord> {
        const row = await this.prisma.demanda.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Demanda não encontrada');
        return toDemanda(row);
    }

    async create(input: CreateDemandaDto, actor?: AuthUserPayload): Promise<DemandaRecord> {
        const total = await this.prisma.demanda.count();
        const created = await this.prisma.demanda.create({
            data: {
                titulo: input.titulo,
                descricao: input.descricao,
                prioridade: input.prioridade,
                status: input.status,
                setor: input.setor,
                responsavel: input.responsavel,
                motivoBloqueio: input.motivoBloqueio,
                criadorId: actor ? String(actor.sub) : null,
                criadorNome: actor?.nome ?? actor?.usua_login ?? null,
                ordem: total,
            },
        });
        return toDemanda(created);
    }

    async update(id: string, input: UpdateDemandaDto, actor: AuthUserPayload): Promise<DemandaRecord> {
        const existing = await this.prisma.demanda.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Demanda não encontrada');

        const statusChanged = input.status && input.status !== existing.status;

        const [updated] = await this.prisma.$transaction([
            this.prisma.demanda.update({
                where: { id },
                data: {
                    ...(input.titulo !== undefined && { titulo: input.titulo }),
                    ...(input.descricao !== undefined && { descricao: input.descricao }),
                    ...(input.prioridade !== undefined && { prioridade: input.prioridade }),
                    ...(input.status !== undefined && { status: input.status }),
                    ...(input.setor !== undefined && { setor: input.setor }),
                    ...(input.responsavel !== undefined && { responsavel: input.responsavel }),
                    ...(input.motivoBloqueio !== undefined && { motivoBloqueio: input.motivoBloqueio }),
                },
            }),
            ...(statusChanged
                ? [
                    this.prisma.historicoAuditoria.create({
                        data: {
                            demandaId: id,
                            de: existing.status,
                            para: input.status!,
                            responsavel: actor.nome,
                            motivo: input.motivoBloqueio,
                        },
                    }),
                ]
                : []),
        ]);
        return toDemanda(updated);
    }

    async updateStatus(id: string, dto: UpdateStatusDto, actor: AuthUserPayload): Promise<DemandaRecord> {
        if (dto.status === 'bloqueado' && !dto.motivo?.trim()) {
            throw new BadRequestException('Motivo é obrigatório para bloquear a demanda');
        }
        return this.update(id, { status: dto.status, motivoBloqueio: dto.motivo }, actor);
    }

    async reordenar(ids: string[]) {
        await this.prisma.$transaction(
            ids.map((id, i) =>
                this.prisma.demanda.update({ where: { id }, data: { ordem: i } }),
            ),
        );
        return { ok: true };
    }

    async remove(id: string) {
        const existing = await this.prisma.demanda.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Demanda não encontrada');
        await this.prisma.demanda.delete({ where: { id } }); // cascades to historico
    }

    async historico(id: string): Promise<HistoricoAuditoria[]> {
        const rows = await this.prisma.historicoAuditoria.findMany({
            where: { demandaId: id },
            orderBy: { timestamp: 'desc' },
        });
        return rows.map(toHistorico);
    }
}

export type { DemandStatus };
