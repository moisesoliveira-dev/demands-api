import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConversasService } from '../conversas/conversas.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
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

const STATUS_LABEL: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    concluido: 'Concluída',
    bloqueado: 'Bloqueada',
};

@Injectable()
export class DemandasService {
    private readonly logger = new Logger(DemandasService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly conversas: ConversasService,
        private readonly notificacoes: NotificacoesService,
    ) { }

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

    async recorrentes(limit = 6): Promise<{ titulo: string; descricao: string; total: number }[]> {
        const groups = await this.prisma.demanda.groupBy({
            by: ['titulo'],
            _count: { titulo: true },
            orderBy: { _count: { titulo: 'desc' } },
            having: { titulo: { _count: { gt: 1 } } },
            take: limit,
        });
        if (!groups.length) return [];
        const result = await Promise.all(
            groups.map(async (g) => {
                const example = await this.prisma.demanda.findFirst({
                    where: { titulo: g.titulo },
                    orderBy: { criadoEm: 'desc' },
                    select: { titulo: true, descricao: true },
                });
                return { titulo: g.titulo, descricao: example?.descricao ?? '', total: g._count.titulo };
            }),
        );
        return result;
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

        // ─── Sincroniza conversa (estilo WhatsApp) + notificações ────────
        await this.sincronizarConversaECriacao(created, actor);

        return toDemanda(created);
    }

    /** Cria a conversa vinculada e dispara notificação ao responsável. */
    private async sincronizarConversaECriacao(
        demanda: { id: string; titulo: string; responsavel: string; criadorNome: string | null },
        actor?: AuthUserPayload,
    ) {
        try {
            await this.conversas.criarConversaDeDemanda({
                demandaId: demanda.id,
                tituloDemanda: demanda.titulo,
                criadorId: actor?.sub ?? null,
                criadorNome: actor?.nome ?? demanda.criadorNome ?? 'Sistema',
                responsavelNome: demanda.responsavel,
            });
        } catch (err) {
            this.logger.error(`Falha ao criar conversa da demanda ${demanda.id}: ${err}`);
        }

        // Notificação ao responsável (se for um User cadastrado e ≠ criador)
        try {
            const resp = await this.prisma.user.findFirst({
                where: { nome: { equals: demanda.responsavel?.trim(), mode: 'insensitive' }, ativo: true },
                select: { id: true },
            });
            if (resp && resp.id !== actor?.sub) {
                await this.notificacoes.add({
                    usuarioId: resp.id,
                    demandaId: demanda.id,
                    tipo: 'demanda_atribuida',
                    titulo: 'Nova demanda atribuída a você',
                    mensagem: `"${demanda.titulo}" foi atribuída a você por ${actor?.nome ?? 'Sistema'
                        }.`,
                    prioridade: 3,
                    acao: `/demandas/${demanda.id}`,
                });
            }
        } catch (err) {
            this.logger.error(`Falha ao notificar responsável da demanda ${demanda.id}: ${err}`);
        }
    }

    async update(id: string, input: UpdateDemandaDto, actor: AuthUserPayload): Promise<DemandaRecord> {
        const existing = await this.prisma.demanda.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Demanda não encontrada');

        const statusChanged = input.status && input.status !== existing.status;
        const responsavelChanged =
            input.responsavel !== undefined && input.responsavel !== existing.responsavel;

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

        await this.sincronizarConversaEAtualizacao(updated, {
            statusChanged: !!statusChanged,
            statusAnterior: existing.status,
            responsavelChanged,
            responsavelAnterior: existing.responsavel,
            motivo: input.motivoBloqueio,
            actor,
        });

        return toDemanda(updated);
    }

    /** Propaga mudanças de status/responsável para conversa + notificações. */
    private async sincronizarConversaEAtualizacao(
        demanda: { id: string; titulo: string; status: string; responsavel: string; criadorId?: string | null; criadorNome?: string | null },
        ctx: {
            statusChanged: boolean;
            statusAnterior: string;
            responsavelChanged: boolean;
            responsavelAnterior: string;
            motivo?: string;
            actor: AuthUserPayload;
        },
    ) {
        // ── Transição → concluido: apaga a conversa ────────────────────────
        if (ctx.statusChanged && demanda.status === 'concluido' && ctx.statusAnterior !== 'concluido') {
            await this.conversas
                .excluirConversaDeDemanda(demanda.id)
                .catch((e) => this.logger.error(`excluirConversa (concluido): ${e}`));
            // Notifica e encerra — sem mensagem de sistema (conversa será deletada)
        }

        // ── Transição DE concluido → outro: recria a conversa ─────────────
        if (ctx.statusChanged && ctx.statusAnterior === 'concluido' && demanda.status !== 'concluido') {
            try {
                const novaConversa = await this.conversas.criarConversaDeDemanda({
                    demandaId: demanda.id,
                    tituloDemanda: demanda.titulo,
                    criadorId: demanda.criadorId,
                    criadorNome: demanda.criadorNome,
                    responsavelNome: demanda.responsavel,
                });
                await this.conversas.postarSistema(
                    novaConversa.id,
                    `Demanda reaberta por ${ctx.actor.nome}. O solicitante foi notificado.`,
                );
            } catch (e) {
                this.logger.error(`recriarConversa (reabrir): ${e}`);
            }
        }

        const conversa = await this.conversas.obterConversaPorDemanda(demanda.id);

        // Status mudou: post sistema + notificação (não para concluido — conversa foi apagada)
        if (ctx.statusChanged && conversa && demanda.status !== 'concluido') {
            const labelDe = STATUS_LABEL[ctx.statusAnterior] ?? ctx.statusAnterior;
            const labelPara = STATUS_LABEL[demanda.status] ?? demanda.status;
            const motivoTxt = demanda.status === 'bloqueado' && ctx.motivo ? ` — motivo: ${ctx.motivo}` : '';
            await this.conversas
                .postarSistema(
                    conversa.id,
                    `Status alterado de "${labelDe}" para "${labelPara}" por ${ctx.actor.nome}${motivoTxt}.`,
                )
                .catch((e) => this.logger.error(`postarSistema (status): ${e}`));
        }

        // Responsável mudou: adiciona novo participante + post sistema + notifica
        if (ctx.responsavelChanged) {
            await this.conversas
                .sincronizarResponsavelDemanda(demanda.id, demanda.responsavel)
                .catch((e) => this.logger.error(`sincronizarResponsavelDemanda: ${e}`));
            if (conversa) {
                await this.conversas
                    .postarSistema(
                        conversa.id,
                        `Responsável alterado de "${ctx.responsavelAnterior}" para "${demanda.responsavel}" por ${ctx.actor.nome}.`,
                    )
                    .catch((e) => this.logger.error(`postarSistema (responsavel): ${e}`));
            }
            try {
                const novo = await this.prisma.user.findFirst({
                    where: { nome: demanda.responsavel?.trim(), ativo: true },
                    select: { id: true },
                });
                if (novo && novo.id !== ctx.actor.sub) {
                    await this.notificacoes.add({
                        usuarioId: novo.id,
                        demandaId: demanda.id,
                        tipo: 'demanda_atribuida',
                        titulo: 'Demanda atribuída a você',
                        mensagem: `"${demanda.titulo}" agora está sob sua responsabilidade.`,
                        prioridade: 3,
                        acao: `/demandas/${demanda.id}`,
                    });
                }
            } catch (e) {
                this.logger.error(`notificar novo responsável: ${e}`);
            }
        }

        // Notificações por mudança de status (envia ao responsável atual)
        if (ctx.statusChanged) {
            try {
                const resp = await this.prisma.user.findFirst({
                    where: { nome: demanda.responsavel?.trim(), ativo: true },
                    select: { id: true },
                });
                if (resp && resp.id !== ctx.actor.sub) {
                    const tipoMap: Record<string, 'demanda_atualizada' | 'demanda_bloqueada' | 'demanda_concluida'> = {
                        bloqueado: 'demanda_bloqueada',
                        concluido: 'demanda_concluida',
                    };
                    const tipo = tipoMap[demanda.status] ?? 'demanda_atualizada';
                    await this.notificacoes.add({
                        usuarioId: resp.id,
                        demandaId: demanda.id,
                        tipo,
                        titulo:
                            tipo === 'demanda_bloqueada'
                                ? 'Demanda bloqueada'
                                : tipo === 'demanda_concluida'
                                    ? 'Demanda concluída'
                                    : 'Demanda atualizada',
                        mensagem: `"${demanda.titulo}" agora está ${STATUS_LABEL[demanda.status] ?? demanda.status}.`,
                        prioridade: demanda.status === 'bloqueado' ? 4 : 3,
                        acao: `/demandas/${demanda.id}`,
                    });
                }
            } catch (e) {
                this.logger.error(`notificar status: ${e}`);
            }
        }
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
