import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUserPayload } from '../common/auth.decorators.js';

export interface ConversaMessage {
    id: string;
    demandaId: string;
    autorId: string;
    autorNome: string;
    autorRole: string;
    conteudo: string;
    criadoEm: string;
}

/**
 * Serviço da aba de conversa em tempo real por demanda.
 *
 * - Persiste mensagens em `DemandaConversa`.
 * - Mantém um `Subject` por demandaId para fan-out via SSE.
 * - Controla acesso: solicitante (criadorId), responsável (nome) ou admin.
 */
@Injectable()
export class DemandaConversaService {
    /** Streams de mensagens por demandaId (in-memory, single-process). */
    private readonly streams = new Map<string, Subject<ConversaMessage>>();

    constructor(private readonly prisma: PrismaService) { }

    private bus(demandaId: string): Subject<ConversaMessage> {
        let s = this.streams.get(demandaId);
        if (!s) {
            s = new Subject<ConversaMessage>();
            this.streams.set(demandaId, s);
        }
        return s;
    }

    /** Stream observável para o controller emitir como SSE. */
    streamFor(demandaId: string) {
        return this.bus(demandaId).asObservable();
    }

    /** Carrega a demanda e checa se o usuário tem acesso (criador, responsável ou admin). */
    async assertAccess(demandaId: string, user: AuthUserPayload): Promise<void> {
        const d = await this.prisma.demanda.findUnique({
            where: { id: demandaId },
            select: { id: true, criadorId: true, responsavel: true },
        });
        if (!d) throw new NotFoundException('Demanda não encontrada');
        if (user.role === 'admin') return;
        const uid = String(user.sub);
        const ulogin = String(user.usua_login || '');
        if (d.criadorId && (d.criadorId === uid || d.criadorId === ulogin)) return;
        if (d.responsavel && d.responsavel.trim() === (user.nome || '').trim()) return;
        throw new ForbiddenException('Sem acesso à conversa desta demanda');
    }

    private resolveAutorRole(demandaCriadorId: string | null, demandaResponsavel: string, user: AuthUserPayload): string {
        if (user.role === 'admin') return 'admin';
        const uid = String(user.sub);
        const ulogin = String(user.usua_login || '');
        if (demandaCriadorId && (demandaCriadorId === uid || demandaCriadorId === ulogin)) return 'solicitante';
        if (demandaResponsavel && demandaResponsavel.trim() === (user.nome || '').trim()) return 'responsavel';
        return 'participante';
    }

    async list(demandaId: string, user: AuthUserPayload): Promise<ConversaMessage[]> {
        await this.assertAccess(demandaId, user);
        const rows = await this.prisma.demandaConversa.findMany({
            where: { demandaId },
            orderBy: { criadoEm: 'asc' },
        });
        return rows.map(this.toMessage);
    }

    async create(demandaId: string, conteudo: string, user: AuthUserPayload): Promise<ConversaMessage> {
        const trimmed = (conteudo || '').trim();
        if (!trimmed) throw new ForbiddenException('Mensagem vazia');

        const d = await this.prisma.demanda.findUnique({
            where: { id: demandaId },
            select: { id: true, criadorId: true, responsavel: true },
        });
        if (!d) throw new NotFoundException('Demanda não encontrada');
        // assertAccess inline (já temos a demanda em memória)
        const uid = String(user.sub);
        const ulogin = String(user.usua_login || '');
        const isAdmin = user.role === 'admin';
        const isCriador = !!d.criadorId && (d.criadorId === uid || d.criadorId === ulogin);
        const isResp = !!d.responsavel && d.responsavel.trim() === (user.nome || '').trim();
        if (!isAdmin && !isCriador && !isResp) {
            throw new ForbiddenException('Sem acesso à conversa desta demanda');
        }

        const autorRole = this.resolveAutorRole(d.criadorId, d.responsavel, user);
        const row = await this.prisma.demandaConversa.create({
            data: {
                demandaId,
                autorId: uid,
                autorNome: user.nome || user.usua_login || uid,
                autorRole,
                conteudo: trimmed,
            },
        });
        const msg = this.toMessage(row);
        this.bus(demandaId).next(msg);
        return msg;
    }

    /** Insere uma mensagem do sistema/IA (sem checagem de acesso). */
    async createSystem(demandaId: string, conteudo: string, autorRole: 'sistema' | 'ia' = 'sistema'): Promise<ConversaMessage> {
        const row = await this.prisma.demandaConversa.create({
            data: {
                demandaId,
                autorId: autorRole,
                autorNome: autorRole === 'ia' ? 'IA' : 'Sistema',
                autorRole,
                conteudo,
            },
        });
        const msg = this.toMessage(row);
        this.bus(demandaId).next(msg);
        return msg;
    }

    private toMessage = (row: {
        id: string; demandaId: string; autorId: string; autorNome: string;
        autorRole: string; conteudo: string; criadoEm: Date;
    }): ConversaMessage => ({
        id: row.id,
        demandaId: row.demandaId,
        autorId: row.autorId,
        autorNome: row.autorNome,
        autorRole: row.autorRole,
        conteudo: row.conteudo,
        criadoEm: row.criadoEm.toISOString(),
    });
}
