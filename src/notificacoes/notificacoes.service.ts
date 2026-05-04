import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toNotificacao, type NotificacaoRecord } from '../prisma/mappers.js';
import type { CreateNotificacaoDto } from './dto/notificacoes.dto.js';

@Injectable()
export class NotificacoesService {
    constructor(private readonly prisma: PrismaService) { }

    async list(usuarioId: string): Promise<NotificacaoRecord[]> {
        const rows = await this.prisma.notificacao.findMany({
            where: { OR: [{ usuarioId }, { usuarioId: null }] },
            orderBy: { timestamp: 'desc' },
        });
        return rows.map(toNotificacao);
    }

    async contadorNaoLidas(usuarioId: string): Promise<number> {
        return this.prisma.notificacao.count({
            where: { lida: false, OR: [{ usuarioId }, { usuarioId: null }] },
        });
    }

    async add(input: CreateNotificacaoDto): Promise<NotificacaoRecord> {
        const created = await this.prisma.notificacao.create({
            data: {
                usuarioId: input.usuarioId ?? null,
                demandaId: input.demandaId,
                tipo: input.tipo ?? 'sistema',
                titulo: input.titulo,
                mensagem: input.mensagem,
                prioridade: input.prioridade ?? 3,
                acao: input.acao,
                lida: false,
            },
        });
        return toNotificacao(created);
    }

    async marcarLida(id: string, usuarioId: string): Promise<NotificacaoRecord> {
        const row = await this.prisma.notificacao.findFirst({
            where: { id, OR: [{ usuarioId }, { usuarioId: null }] },
        });
        if (!row) throw new NotFoundException('Notificação não encontrada');
        const updated = await this.prisma.notificacao.update({
            where: { id },
            data: { lida: true },
        });
        return toNotificacao(updated);
    }

    async marcarTodasLidas(usuarioId: string) {
        const result = await this.prisma.notificacao.updateMany({
            where: { lida: false, OR: [{ usuarioId }, { usuarioId: null }] },
            data: { lida: true },
        });
        return { atualizadas: result.count };
    }

    async limpar(usuarioId: string) {
        await this.prisma.notificacao.deleteMany({ where: { usuarioId } });
    }

    async remover(id: string, usuarioId: string): Promise<void> {
        const row = await this.prisma.notificacao.findFirst({
            where: { id, OR: [{ usuarioId }, { usuarioId: null }] },
        });
        if (!row) throw new NotFoundException('Notificação não encontrada');
        await this.prisma.notificacao.delete({ where: { id } });
    }
}
