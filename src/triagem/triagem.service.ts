import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
    toChatSession, type ChatSessionRecord, type ChatMessage,
} from '../prisma/mappers.js';
import type { ConfirmarDto, UpdateSessionDto } from './dto/triagem.dto.js';
import { DemandasService } from '../demandas/demandas.service.js';
import type { AuthUserPayload } from '../common/auth.decorators.js';

const SETORES = ['Usinagem', 'Montagem', 'Pintura', 'Manutenção', 'Qualidade', 'Expedição'];
const RESPONSAVEIS = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza'];

const MAX = 30;

interface AgentReply {
    message: ChatMessage;
    step: ChatSessionRecord['step'];
    draft: ChatSessionRecord['draft'];
}

export type { AgentReply };

function newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable()
export class TriagemService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly demandas: DemandasService,
    ) { }

    async list(usuarioId: string): Promise<ChatSessionRecord[]> {
        const rows = await this.prisma.chatSession.findMany({
            where: { usuarioId },
            orderBy: { atualizadaEm: 'desc' },
        });
        return rows.map(toChatSession);
    }

    async get(id: string, usuarioId: string): Promise<ChatSessionRecord> {
        const row = await this.prisma.chatSession.findFirst({ where: { id, usuarioId } });
        if (!row) throw new NotFoundException('Sessão não encontrada');
        return toChatSession(row);
    }

    async create(usuarioId: string): Promise<ChatSessionRecord> {
        const created = await this.prisma.chatSession.create({
            data: {
                usuarioId,
                titulo: 'Nova triagem',
                step: 'descricao',
                status: 'andamento',
                draft: '{}',
                messages: '[]',
            },
        });

        // per-user cap
        const all = await this.prisma.chatSession.findMany({
            where: { usuarioId },
            orderBy: { atualizadaEm: 'desc' },
            select: { id: true },
        });
        if (all.length > MAX) {
            const drop = all.slice(MAX).map((s) => s.id);
            await this.prisma.chatSession.deleteMany({ where: { id: { in: drop } } });
        }
        return toChatSession(created);
    }

    async update(id: string, usuarioId: string, input: UpdateSessionDto): Promise<ChatSessionRecord> {
        const existing = await this.get(id, usuarioId);
        const data: Record<string, unknown> = {};
        if (input.titulo !== undefined) data['titulo'] = input.titulo;
        if (input.step !== undefined) data['step'] = input.step;
        if (input.draft !== undefined) data['draft'] = JSON.stringify({ ...existing.draft, ...input.draft });
        if (input.messages !== undefined) data['messages'] = JSON.stringify(input.messages);
        if (input.status !== undefined) data['status'] = input.status;

        const updated = await this.prisma.chatSession.update({ where: { id }, data });
        return toChatSession(updated);
    }

    async remove(id: string, usuarioId: string) {
        const existing = await this.prisma.chatSession.findFirst({ where: { id, usuarioId } });
        if (!existing) throw new NotFoundException('Sessão não encontrada');
        await this.prisma.chatSession.delete({ where: { id } });
    }

    async reply(id: string, usuarioId: string, texto: string): Promise<{ session: ChatSessionRecord; reply: AgentReply }> {
        const s = await this.get(id, usuarioId);
        const now = new Date().toISOString();

        const userMsg: ChatMessage = { id: newId('msg'), role: 'user', content: texto, timestamp: now };
        const messages = [...s.messages, userMsg];
        if (!s.titulo || s.titulo === 'Nova triagem') s.titulo = texto.slice(0, 60);

        const reply = this.computeNext(s, texto);
        messages.push(reply.message);

        const updated = await this.prisma.chatSession.update({
            where: { id },
            data: {
                titulo: s.titulo,
                step: reply.step,
                draft: JSON.stringify(reply.draft),
                messages: JSON.stringify(messages),
            },
        });
        return { session: toChatSession(updated), reply };
    }

    private computeNext(s: ChatSessionRecord, texto: string): AgentReply {
        const draft = { ...s.draft };
        const msg = (content: string, suggestions?: string[], summary?: ChatMessage['summary']): ChatMessage => ({
            id: newId('msg'),
            role: 'agent',
            content,
            timestamp: new Date().toISOString(),
            suggestions,
            summary,
        });

        switch (s.step) {
            case 'descricao': {
                draft.descricao = texto;
                draft.titulo = texto.split(/[.\n]/)[0].slice(0, 80) || texto.slice(0, 80);
                const sugestao = SETORES.find((set) => texto.toLowerCase().includes(set.toLowerCase()));
                if (sugestao) draft.setor = sugestao;
                return {
                    message: msg(`Entendi. Em qual setor essa demanda deve ser executada?`, SETORES),
                    step: 'setor',
                    draft,
                };
            }
            case 'setor': {
                draft.setor = texto.trim();
                return {
                    message: msg(`Quem deve ficar responsável?`, RESPONSAVEIS),
                    step: 'responsavel',
                    draft,
                };
            }
            case 'responsavel': {
                draft.responsavel = texto.trim();
                return {
                    message: msg(`Qual a prioridade? (1 = baixa, 5 = crítica)`, ['1', '2', '3', '4', '5']),
                    step: 'prioridade',
                    draft,
                };
            }
            case 'prioridade': {
                const n = Math.min(5, Math.max(1, Number(texto.trim()) || 3)) as 1 | 2 | 3 | 4 | 5;
                draft.prioridade = n;
                return {
                    message: msg(
                        `Confira o resumo da demanda. Posso confirmar a criação?`,
                        ['Confirmar', 'Editar'],
                        {
                            titulo: draft.titulo,
                            descricao: draft.descricao,
                            setor: draft.setor,
                            responsavel: draft.responsavel,
                            prioridade: draft.prioridade,
                        },
                    ),
                    step: 'confirmacao',
                    draft,
                };
            }
            case 'confirmacao': {
                if (/edit/i.test(texto)) {
                    return {
                        message: msg(`Sem problema. Reescreva a descrição da demanda.`),
                        step: 'descricao',
                        draft,
                    };
                }
                return {
                    message: msg(`Use o endpoint de confirmação para criar a demanda.`),
                    step: 'confirmacao',
                    draft,
                };
            }
            case 'criada':
            default:
                return {
                    message: msg(`Demanda já criada. Inicie uma nova triagem.`),
                    step: 'criada',
                    draft,
                };
        }
    }

    async confirmar(id: string, usuarioId: string, dto: ConfirmarDto, _actor: AuthUserPayload) {
        const s = await this.get(id, usuarioId);
        if (s.status === 'criada') throw new BadRequestException('Sessão já finalizada');
        const dem = await this.demandas.create({
            titulo: dto.titulo,
            descricao: dto.descricao,
            setor: dto.setor,
            responsavel: dto.responsavel,
            prioridade: dto.prioridade,
            status: 'pendente',
        });
        const now = new Date().toISOString();
        const messages: ChatMessage[] = [
            ...s.messages,
            { id: newId('msg'), role: 'agent', content: `Demanda criada com sucesso (ID ${dem.id}).`, timestamp: now },
        ];
        const updated = await this.prisma.chatSession.update({
            where: { id },
            data: {
                status: 'criada',
                step: 'criada',
                draft: JSON.stringify({ ...dto }),
                messages: JSON.stringify(messages),
            },
        });
        return { session: toChatSession(updated), demanda: dem };
    }
}
