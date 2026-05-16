/**
 * Mappers: convert Prisma row shapes <-> public API shapes.
 * Keep API contracts identical to the previous in-memory DataStore.
 */
import type {
    User as PrismaUser,
    Demanda as PrismaDemanda,
    HistoricoAuditoria as PrismaHistorico,
    Notificacao as PrismaNotificacao,
    Setor as PrismaSetor,
    ChatSession as PrismaChatSession,
} from '@prisma/client';
import type { Permission, Role } from '../common/permissions.js';

// ---------- Domain types (match previous DataStore types) ----------

export type DemandStatus = 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado';
export type Prioridade = 1 | 2 | 3 | 4 | 5;

export interface UserRecord {
    id: string;
    nome: string;
    email: string;
    senhaHash: string;
    cargo: string;
    setor: string;
    role: Role;
    customPermissions?: Permission[];
    avatar?: string;
    avatarUrl?: string;
    ativo: boolean;
    criadoEm: string;
    ultimoAcesso?: string;
}

export interface DemandaRecord {
    id: string;
    titulo: string;
    descricao: string;
    prioridade: Prioridade;
    status: DemandStatus;
    setor: string;
    responsavel: string;
    criadoEm: string;
    atualizadoEm: string;
    ordem?: number;
    motivoBloqueio?: string;
    criadorId?: string;
    criadorNome?: string;
}

export interface HistoricoAuditoria {
    id: string;
    demandaId: string;
    de: DemandStatus;
    para: DemandStatus;
    responsavel: string;
    motivo?: string;
    timestamp: string;
}

export type NotificacaoTipo =
    | 'demanda_criada'
    | 'demanda_atualizada'
    | 'demanda_bloqueada'
    | 'demanda_concluida'
    | 'demanda_atribuida'
    | 'sistema'
    | 'alerta';

export interface NotificacaoRecord {
    id: string;
    usuarioId: string | null;
    demandaId?: string;
    tipo: NotificacaoTipo;
    titulo: string;
    mensagem: string;
    prioridade: Prioridade;
    acao?: string;
    lida: boolean;
    timestamp: string;
}

export interface SetorRecord {
    id: string;
    nome: string;
    descricao: string;
    responsavel: string;
    ativo: boolean;
    criadoEm: string;
}

export interface ChatMessage {
    id: string;
    role: 'agent' | 'user';
    content: string;
    timestamp: string;
    suggestions?: string[];
    summary?: Partial<DemandaRecord>;
}

export interface ChatSessionRecord {
    id: string;
    usuarioId: string;
    titulo: string;
    messages: ChatMessage[];
    step: 'descricao' | 'setor' | 'responsavel' | 'prioridade' | 'confirmacao' | 'criada';
    draft: Partial<Pick<DemandaRecord, 'titulo' | 'descricao' | 'setor' | 'responsavel' | 'prioridade'>>;
    criadaEm: string;
    atualizadaEm: string;
    status: 'andamento' | 'criada';
}

// ---------- Helpers ----------

const iso = (d: Date | null | undefined): string | undefined =>
    d ? new Date(d).toISOString() : undefined;

function parseJson<T>(s: string, fallback: T): T {
    try {
        return JSON.parse(s) as T;
    } catch {
        return fallback;
    }
}

// ---------- User ----------

export function toUser(p: PrismaUser): UserRecord {
    return {
        id: p.id,
        nome: p.nome,
        email: p.email,
        senhaHash: p.senhaHash,
        cargo: p.cargo,
        setor: p.setor,
        role: p.role as Role,
        customPermissions: parseJson<Permission[]>(p.customPermissions, []),
        avatar: p.avatar ?? undefined,
        avatarUrl: p.avatarUrl ?? undefined,
        ativo: p.ativo,
        criadoEm: iso(p.criadoEm)!,
        ultimoAcesso: iso(p.ultimoAcesso),
    };
}

export function serializeCustomPermissions(perms?: Permission[]): string {
    return JSON.stringify(perms ?? []);
}

// ---------- Setor ----------

export function toSetor(p: PrismaSetor): SetorRecord {
    return {
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        responsavel: p.responsavel,
        ativo: p.ativo,
        criadoEm: iso(p.criadoEm)!,
    };
}

// ---------- Demanda ----------

export function toDemanda(p: PrismaDemanda): DemandaRecord {
    return {
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao,
        prioridade: p.prioridade as Prioridade,
        status: p.status as DemandStatus,
        setor: p.setor,
        responsavel: p.responsavel,
        criadoEm: iso(p.criadoEm)!,
        atualizadoEm: iso(p.atualizadoEm)!,
        ordem: p.ordem,
        motivoBloqueio: p.motivoBloqueio ?? undefined,
        criadorId: (p as { criadorId?: string | null }).criadorId ?? undefined,
        criadorNome: (p as { criadorNome?: string | null }).criadorNome ?? undefined,
    };
}

// ---------- Historico ----------

export function toHistorico(p: PrismaHistorico): HistoricoAuditoria {
    return {
        id: p.id,
        demandaId: p.demandaId,
        de: p.de as DemandStatus,
        para: p.para as DemandStatus,
        responsavel: p.responsavel,
        motivo: p.motivo ?? undefined,
        timestamp: iso(p.timestamp)!,
    };
}

// ---------- Notificacao ----------

export function toNotificacao(p: PrismaNotificacao): NotificacaoRecord {
    return {
        id: p.id,
        usuarioId: p.usuarioId,
        demandaId: p.demandaId ?? undefined,
        tipo: (p.tipo as NotificacaoTipo) ?? 'sistema',
        titulo: p.titulo,
        mensagem: p.mensagem,
        prioridade: p.prioridade as Prioridade,
        acao: p.acao ?? undefined,
        lida: p.lida,
        timestamp: iso(p.timestamp)!,
    };
}

// ---------- ChatSession ----------

export function toChatSession(p: PrismaChatSession): ChatSessionRecord {
    return {
        id: p.id,
        usuarioId: p.usuarioId,
        titulo: p.titulo,
        step: p.step as ChatSessionRecord['step'],
        status: p.status as ChatSessionRecord['status'],
        draft: parseJson<ChatSessionRecord['draft']>(p.draft, {}),
        messages: parseJson<ChatMessage[]>(p.messages, []),
        criadaEm: iso(p.criadaEm)!,
        atualizadaEm: iso(p.atualizadaEm)!,
    };
}
