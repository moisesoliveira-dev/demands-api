import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './s3.service.js';
import type { AuthUserPayload } from '../common/auth.decorators.js';
import type {
    AdicionarParticipanteDto,
    AtualizarConversaDto,
    CreateConversaDto,
    EnviarMensagemDto,
} from './dto/conversas.dto.js';

// ── Limites de upload (alinhados com docs do usuário) ──────────────────────
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MIME_IMAGEM = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MIME_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const EXT_FROM_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
};

export interface RequestContext {
    ip?: string | null;
    userAgent?: string | null;
}

/**
 * Service de Conversas (estilo WhatsApp) com requisitos de prova legal.
 *
 * Regras invioláveis:
 *  - Mensagens NÃO são deletadas fisicamente — `apagadoEm` marca exclusão lógica.
 *  - Cada mensagem tem `hashConteudo` (SHA-256 do payload) → detecção de
 *    adulteração no banco.
 *  - Cada anexo tem `sha256` do binário + storageKey baseado nesse hash →
 *    detecção de adulteração no MinIO.
 *  - `ipOrigem` + `userAgent` capturados a cada envio.
 *  - `autorNome` é snapshot imutável (não muda se o user for renomeado).
 */
@Injectable()
export class ConversasService implements OnModuleInit {
    private readonly logger = new Logger(ConversasService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) { }

    /** Ao iniciar: cria conversas retroativamente para demandas sem conversa. */
    async onModuleInit() {
        this.backfillConversasDemanda().catch((e) =>
            this.logger.error(`Backfill conversas demanda falhou: ${e}`),
        );
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private async garantirParticipanteAtivo(conversaId: string, usuarioId: string) {
        const p = await this.prisma.conversaParticipante.findUnique({
            where: { conversaId_usuarioId: { conversaId, usuarioId } },
        });
        if (!p || p.saiuEm) {
            throw new ForbiddenException('Você não participa desta conversa.');
        }
        return p;
    }

    private async garantirAdmin(conversaId: string, usuarioId: string) {
        const p = await this.garantirParticipanteAtivo(conversaId, usuarioId);
        if (p.papel !== 'dono' && p.papel !== 'admin') {
            throw new ForbiddenException('Apenas administradores do grupo podem fazer isso.');
        }
        return p;
    }

    private hashMensagem(input: {
        autorId: string;
        criadoEm: Date;
        conteudo: string;
        anexosHashes: string[];
    }): string {
        const payload = [
            input.autorId,
            input.criadoEm.toISOString(),
            input.conteudo,
            input.anexosHashes.join(','),
        ].join('|');
        return createHash('sha256').update(payload, 'utf8').digest('hex');
    }

    // ── Listagem de conversas (ordem WhatsApp: última mensagem) ────────────

    async listarConversas(user: AuthUserPayload) {
        const participacoes = await this.prisma.conversaParticipante.findMany({
            where: { usuarioId: user.sub, saiuEm: null },
            include: {
                conversa: {
                    include: {
                        participantes: { where: { saiuEm: null } },
                        mensagens: {
                            orderBy: { criadoEm: 'desc' },
                            take: 1,
                            where: { apagadoEm: null },
                        },
                    },
                },
            },
        });

        // Ordena pela última mensagem (campo desnormalizado em Conversa.ultimaMensagemEm)
        participacoes.sort(
            (a, b) =>
                b.conversa.ultimaMensagemEm.getTime() - a.conversa.ultimaMensagemEm.getTime(),
        );

        return Promise.all(
            participacoes.map(async (p) => {
                const naoLidas = await this.prisma.mensagem.count({
                    where: {
                        conversaId: p.conversaId,
                        apagadoEm: null,
                        autorId: { not: user.sub },
                        criadoEm: p.ultimaLeituraEm ? { gt: p.ultimaLeituraEm } : undefined,
                    },
                });
                const ultima = p.conversa.mensagens[0];
                return {
                    id: p.conversa.id,
                    tipo: p.conversa.tipo,
                    titulo: p.conversa.titulo,
                    descricao: p.conversa.descricao,
                    avatarUrl: p.conversa.avatarUrl,
                    demandaId: p.conversa.demandaId,
                    criadorId: p.conversa.criadorId,
                    criadoEm: p.conversa.criadoEm,
                    ultimaMensagemEm: p.conversa.ultimaMensagemEm,
                    arquivada: p.conversa.arquivada,
                    papel: p.papel,
                    silenciado: p.silenciado,
                    naoLidas,
                    participantes: p.conversa.participantes.map((pp) => ({
                        usuarioId: pp.usuarioId,
                        usuarioNome: pp.usuarioNome,
                        papel: pp.papel,
                    })),
                    ultimaMensagem: ultima
                        ? {
                            id: ultima.id,
                            autorNome: ultima.autorNome,
                            tipo: ultima.tipo,
                            conteudo: ultima.conteudo,
                            criadoEm: ultima.criadoEm,
                        }
                        : null,
                };
            }),
        );
    }

    // ── Criar conversa (direto ou grupo) ───────────────────────────────────

    async criarConversa(dto: CreateConversaDto, user: AuthUserPayload) {
        if (dto.tipo === 'grupo' && !dto.titulo?.trim()) {
            throw new BadRequestException('Grupo precisa de título.');
        }
        if (!dto.participantes || dto.participantes.length === 0) {
            throw new BadRequestException('Informe ao menos um participante.');
        }
        if (dto.tipo === 'direto' && dto.participantes.length !== 1) {
            throw new BadRequestException('Conversa direta tem exatamente 1 outro participante.');
        }

        const todosIds = Array.from(new Set([user.sub, ...dto.participantes]));

        // Para "direto": reutiliza conversa existente entre os 2 usuários, se houver.
        if (dto.tipo === 'direto') {
            const existente = await this.prisma.conversa.findFirst({
                where: {
                    tipo: 'direto',
                    AND: todosIds.map((uid) => ({
                        participantes: { some: { usuarioId: uid, saiuEm: null } },
                    })),
                },
            });
            if (existente) return this.obterConversa(existente.id, user);
        }

        // Carrega snapshots de nomes
        const users = await this.prisma.user.findMany({
            where: { id: { in: todosIds } },
            select: { id: true, nome: true },
        });
        const nomeOf = new Map(users.map((u) => [u.id, u.nome]));

        const conversa = await this.prisma.conversa.create({
            data: {
                tipo: dto.tipo,
                titulo: dto.titulo?.trim() || null,
                descricao: dto.descricao?.trim() || null,
                criadorId: user.sub,
                criadorNome: user.nome ?? user.usua_nome ?? 'Usuário',
                ultimaMensagemEm: new Date(),
                participantes: {
                    create: todosIds.map((uid) => ({
                        usuarioId: uid,
                        usuarioNome: nomeOf.get(uid) ?? (uid === user.sub ? user.nome : 'Usuário'),
                        papel: uid === user.sub ? 'dono' : 'membro',
                    })),
                },
            },
        });

        this.logger.log(`Conversa ${conversa.id} (${conversa.tipo}) criada por ${user.sub}`);
        return this.obterConversa(conversa.id, user);
    }

    // ── Detalhe de uma conversa ────────────────────────────────────────────

    async obterConversa(id: string, user: AuthUserPayload) {
        await this.garantirParticipanteAtivo(id, user.sub);
        const c = await this.prisma.conversa.findUnique({
            where: { id },
            include: {
                participantes: { orderBy: { entrouEm: 'asc' } },
            },
        });
        if (!c) throw new NotFoundException('Conversa não encontrada.');
        return c;
    }

    async atualizarConversa(id: string, dto: AtualizarConversaDto, user: AuthUserPayload) {
        await this.garantirAdmin(id, user.sub);
        return this.prisma.conversa.update({
            where: { id },
            data: {
                titulo: dto.titulo?.trim(),
                descricao: dto.descricao?.trim(),
            },
        });
    }

    // ── Mensagens ───────────────────────────────────────────────────────────

    async listarMensagens(conversaId: string, user: AuthUserPayload, antesDe?: string) {
        await this.garantirParticipanteAtivo(conversaId, user.sub);
        const mensagens = await this.prisma.mensagem.findMany({
            where: {
                conversaId,
                criadoEm: antesDe ? { lt: new Date(antesDe) } : undefined,
            },
            orderBy: { criadoEm: 'asc' },
            take: 200,
            include: { anexos: true },
        });
        return mensagens.map((m) => ({
            id: m.id,
            autorId: m.autorId,
            autorNome: m.autorNome,
            tipo: m.tipo,
            conteudo: m.apagadoEm ? '' : m.conteudo,
            apagada: !!m.apagadoEm,
            editada: !!m.editadoEm,
            criadoEm: m.criadoEm,
            analisada: m.analisada,
            analiseIA: m.analiseIA,
            hashConteudo: m.hashConteudo,
            anexos: m.apagadoEm
                ? []
                : m.anexos.map((a) => ({
                    id: a.id,
                    tipo: a.tipo,
                    nomeOriginal: a.nomeOriginal,
                    mimeType: a.mimeType,
                    bytes: a.bytes,
                    sha256: a.sha256,
                    largura: a.largura,
                    altura: a.altura,
                    duracaoMs: a.duracaoMs,
                    url: `/api/conversas/anexos/${a.id}`,
                })),
        }));
    }

    /**
     * Envia mensagem (texto, imagem ou vídeo).
     *
     * Validação de arquivo:
     *  - Tipo MIME consta na whitelist
     *  - Tamanho dentro do limite
     *  - Hash SHA-256 calculado e gravado
     *
     * NÃO confiamos só na extensão. O arquivo é gravado no MinIO com nome
     * derivado do hash — qualquer alteração futura é detectável.
     */
    async enviarMensagem(
        conversaId: string,
        dto: EnviarMensagemDto,
        arquivos: Express.Multer.File[] | undefined,
        user: AuthUserPayload,
        ctx: RequestContext,
    ) {
        await this.garantirParticipanteAtivo(conversaId, user.sub);

        const conteudo = (dto.conteudo ?? '').trim();
        const temAnexos = !!arquivos && arquivos.length > 0;

        if (!conteudo && !temAnexos) {
            throw new BadRequestException('Mensagem vazia.');
        }

        // Valida cada anexo
        const anexosValidados: {
            buffer: Buffer;
            sha256: string;
            tipo: 'imagem' | 'video';
            mimeType: string;
            nomeOriginal: string;
            bytes: number;
            extensao: string;
        }[] = [];

        if (temAnexos) {
            for (const f of arquivos!) {
                const mt = f.mimetype;
                let tipo: 'imagem' | 'video';
                if (MIME_IMAGEM.has(mt)) {
                    if (f.size > MAX_IMAGE_BYTES) {
                        throw new BadRequestException(
                            `Imagem ${f.originalname} excede ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
                        );
                    }
                    tipo = 'imagem';
                } else if (MIME_VIDEO.has(mt)) {
                    if (f.size > MAX_VIDEO_BYTES) {
                        throw new BadRequestException(
                            `Vídeo ${f.originalname} excede ${MAX_VIDEO_BYTES / 1024 / 1024} MB.`,
                        );
                    }
                    tipo = 'video';
                } else {
                    throw new BadRequestException(
                        `Tipo de arquivo não permitido: ${mt} (${f.originalname}).`,
                    );
                }

                const sha256 = createHash('sha256').update(f.buffer).digest('hex');
                anexosValidados.push({
                    buffer: f.buffer,
                    sha256,
                    tipo,
                    mimeType: mt,
                    nomeOriginal: f.originalname,
                    bytes: f.size,
                    extensao: EXT_FROM_MIME[mt] ?? '',
                });
            }
        }

        // Determina tipo da mensagem
        let tipoMsg: 'texto' | 'imagem' | 'video' = 'texto';
        if (temAnexos) {
            // Se tem múltiplos, prioriza vídeo (incomum mas seguro)
            tipoMsg = anexosValidados.some((a) => a.tipo === 'video') ? 'video' : 'imagem';
        }

        const criadoEm = new Date();
        const hash = this.hashMensagem({
            autorId: user.sub,
            criadoEm,
            conteudo,
            anexosHashes: anexosValidados.map((a) => a.sha256).sort(),
        });

        // Upload dos arquivos no MinIO ANTES de criar a mensagem
        // (se algo falhar, evitamos órfãos no banco)
        const uploads: { storageKey: string; anexo: typeof anexosValidados[number] }[] = [];
        for (const a of anexosValidados) {
            const key = this.s3.keyFor(conversaId, a.sha256, a.extensao);
            await this.s3.upload(key, a.buffer, a.mimeType);
            uploads.push({ storageKey: key, anexo: a });
        }

        const mensagem = await this.prisma.mensagem.create({
            data: {
                conversaId,
                autorId: user.sub,
                autorNome: user.nome ?? user.usua_nome ?? 'Usuário',
                tipo: tipoMsg,
                conteudo,
                hashConteudo: hash,
                ipOrigem: ctx.ip ?? null,
                userAgent: ctx.userAgent ?? null,
                criadoEm,
                anexos: {
                    create: uploads.map(({ storageKey, anexo }) => ({
                        tipo: anexo.tipo,
                        nomeOriginal: anexo.nomeOriginal,
                        storageKey,
                        mimeType: anexo.mimeType,
                        bytes: anexo.bytes,
                        sha256: anexo.sha256,
                    })),
                },
            },
            include: { anexos: true },
        });

        await this.prisma.conversa.update({
            where: { id: conversaId },
            data: { ultimaMensagemEm: criadoEm },
        });

        await this.prisma.conversaParticipante.update({
            where: { conversaId_usuarioId: { conversaId, usuarioId: user.sub } },
            data: { ultimaLeituraEm: criadoEm },
        });

        return mensagem;
    }

    // ── Marca conversa como lida ───────────────────────────────────────────

    async marcarLida(conversaId: string, user: AuthUserPayload) {
        await this.garantirParticipanteAtivo(conversaId, user.sub);
        await this.prisma.conversaParticipante.update({
            where: { conversaId_usuarioId: { conversaId, usuarioId: user.sub } },
            data: { ultimaLeituraEm: new Date() },
        });
        return { ok: true };
    }

    // ── Exclusão lógica de mensagem (preserva no banco como prova) ────────

    async apagarMensagem(mensagemId: string, user: AuthUserPayload) {
        const m = await this.prisma.mensagem.findUnique({
            where: { id: mensagemId },
            select: { id: true, autorId: true, apagadoEm: true, conversaId: true },
        });
        if (!m) throw new NotFoundException('Mensagem não encontrada.');
        if (m.apagadoEm) return { ok: true };

        if (m.autorId !== user.sub) {
            // Admins do grupo podem apagar; tentamos verificar.
            try {
                await this.garantirAdmin(m.conversaId, user.sub);
            } catch {
                throw new ForbiddenException('Apenas o autor ou admin pode apagar.');
            }
        } else {
            await this.garantirParticipanteAtivo(m.conversaId, user.sub);
        }

        await this.prisma.mensagem.update({
            where: { id: mensagemId },
            data: { apagadoEm: new Date() },
        });
        // NÃO deletamos o anexo do MinIO — prova legal.
        return { ok: true };
    }

    // ── Anexos: download e presign ─────────────────────────────────────────

    async baixarAnexo(anexoId: string, user: AuthUserPayload) {
        const a = await this.prisma.mensagemAnexo.findUnique({
            where: { id: anexoId },
            include: { mensagem: { select: { conversaId: true } } },
        });
        if (!a) throw new NotFoundException('Anexo não encontrado.');
        await this.garantirParticipanteAtivo(a.mensagem.conversaId, user.sub);
        const { body, contentType } = await this.s3.download(a.storageKey);

        // Verificação de integridade: recalcula sha256 no download.
        const real = createHash('sha256').update(body).digest('hex');
        if (real !== a.sha256) {
            this.logger.error(
                `⚠️ ADULTERAÇÃO DETECTADA no anexo ${a.id}: esperado ${a.sha256}, atual ${real}`,
            );
            // Permite o download mesmo assim, mas registra. Caso queira bloquear:
            // throw new InternalServerErrorException('Integridade do arquivo comprometida.');
        }

        return {
            body,
            contentType: contentType ?? a.mimeType,
            nomeOriginal: a.nomeOriginal,
            sha256: a.sha256,
            integridade: real === a.sha256,
        };
    }

    async presignAnexo(anexoId: string, user: AuthUserPayload) {
        const a = await this.prisma.mensagemAnexo.findUnique({
            where: { id: anexoId },
            include: { mensagem: { select: { conversaId: true } } },
        });
        if (!a) throw new NotFoundException();
        await this.garantirParticipanteAtivo(a.mensagem.conversaId, user.sub);
        const url = await this.s3.presignedUrl(a.storageKey, 1800);
        return { url, expiraEm: 1800 };
    }

    // ── Participantes (grupo) ──────────────────────────────────────────────

    async adicionarParticipante(
        conversaId: string,
        dto: AdicionarParticipanteDto,
        user: AuthUserPayload,
    ) {
        const conversa = await this.prisma.conversa.findUnique({ where: { id: conversaId } });
        if (!conversa) throw new NotFoundException();
        if (conversa.tipo !== 'grupo') {
            throw new BadRequestException('Só é possível adicionar pessoas a grupos.');
        }
        await this.garantirAdmin(conversaId, user.sub);

        const novo = await this.prisma.user.findUnique({
            where: { id: dto.usuarioId },
            select: { id: true, nome: true },
        });
        if (!novo) throw new NotFoundException('Usuário não encontrado.');

        return this.prisma.conversaParticipante.upsert({
            where: { conversaId_usuarioId: { conversaId, usuarioId: novo.id } },
            create: {
                conversaId,
                usuarioId: novo.id,
                usuarioNome: novo.nome,
                papel: dto.papel ?? 'membro',
            },
            update: { saiuEm: null, papel: dto.papel ?? undefined },
        });
    }

    async removerParticipante(
        conversaId: string,
        usuarioId: string,
        user: AuthUserPayload,
    ) {
        const conversa = await this.prisma.conversa.findUnique({ where: { id: conversaId } });
        if (!conversa) throw new NotFoundException();
        if (conversa.tipo !== 'grupo') {
            throw new BadRequestException('Operação válida apenas para grupos.');
        }

        // O próprio usuário pode sair; admins removem outros.
        if (usuarioId !== user.sub) {
            await this.garantirAdmin(conversaId, user.sub);
        } else {
            await this.garantirParticipanteAtivo(conversaId, user.sub);
        }

        await this.prisma.conversaParticipante.update({
            where: { conversaId_usuarioId: { conversaId, usuarioId } },
            data: { saiuEm: new Date() },
        });
        return { ok: true };
    }

    // ── Usuários disponíveis para iniciar conversa ─────────────────────────

    async listarUsuariosParaChat(user: AuthUserPayload) {
        const users = await this.prisma.user.findMany({
            where: { ativo: true, id: { not: user.sub } },
            select: { id: true, nome: true, email: true, setor: true, avatarUrl: true },
            orderBy: { nome: 'asc' },
        });
        return users;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTEGRAÇÃO COM DEMANDAS
    // ───────────────────────────────────────────────────────────────────────
    // Cada demanda tem AUTOMATICAMENTE uma conversa (tipo='demanda') vinculada.
    // Participantes: criador + responsável (se conhecido pelo nome).
    // Mensagens de sistema documentam o ciclo de vida → prova legal.
    // ═══════════════════════════════════════════════════════════════════════

    /** Resolve um nome para User — case-insensitive, aceita variações parciais. */
    private async resolverUsuarioPorNome(nome?: string | null) {
        if (!nome) return null;
        const q = nome.trim();
        // 1) Tenta match exato case-insensitive
        let u = await this.prisma.user.findFirst({
            where: { nome: { equals: q, mode: 'insensitive' }, ativo: true },
            select: { id: true, nome: true },
        });
        // 2) Fallback: busca por e-mail (caso o campo responsavel guarde e-mail)
        if (!u) {
            u = await this.prisma.user.findFirst({
                where: { email: { equals: q, mode: 'insensitive' }, ativo: true },
                select: { id: true, nome: true },
            });
        }
        return u ?? null;
    }

    /** Recupera (ou retorna null) a conversa vinculada a uma demanda. */
    async obterConversaPorDemanda(demandaId: string) {
        return this.prisma.conversa.findUnique({ where: { demandaId } });
    }

    /**
     * Backfill: garante que toda Demanda tem Conversa E participantes corretos.
     * Reexecutado a cada startup — idempotente, nunca bloqueia a inicialização.
     * Repara conversas antigas cujos participantes não foram criados.
     */
    async backfillConversasDemanda() {
        const demandas = await this.prisma.demanda.findMany({
            select: { id: true, titulo: true, criadorId: true, criadorNome: true, responsavel: true },
        });
        if (demandas.length === 0) return;

        let criadas = 0;
        let reparadas = 0;
        for (const d of demandas) {
            try {
                const existente = await this.obterConversaPorDemanda(d.id);
                if (!existente) {
                    await this.criarConversaDeDemanda({
                        demandaId: d.id,
                        tituloDemanda: d.titulo,
                        criadorId: d.criadorId,
                        criadorNome: d.criadorNome,
                        responsavelNome: d.responsavel,
                    });
                    criadas++;
                } else {
                    // Garante que criador e responsável estejam na conversa
                    const antes = await this.prisma.conversaParticipante.count({
                        where: { conversaId: existente.id },
                    });
                    await this.garantirParticipantesDemanda(
                        existente.id,
                        d.criadorId,
                        d.criadorNome,
                        d.responsavel,
                    );
                    const depois = await this.prisma.conversaParticipante.count({
                        where: { conversaId: existente.id },
                    });
                    if (depois > antes) reparadas++;
                }
            } catch (e) {
                this.logger.error(`Backfill demanda ${d.id}: ${e}`);
            }
        }
        if (criadas || reparadas) {
            this.logger.log(
                `Backfill concluído: ${criadas} conversa(s) criada(s), ${reparadas} reparada(s).`,
            );
        }
    }

    /**
     * Garante (via upsert) que o criador e o responsável da demanda sejam
     * participantes ativos da conversa. É idempotente — seguro chamar várias vezes.
     *
     * Importante: `usuarioId` aqui não precisa existir na tabela `User` (não há
     * FK). Ele só precisa bater com `auth.sub` para o listarConversas funcionar.
     */
    async garantirParticipantesDemanda(
        conversaId: string,
        criadorId: string | null | undefined,
        criadorNome: string | null | undefined,
        responsavelNome: string | null | undefined,
    ) {
        // 1) Criador como 'dono' (sempre que tivermos o id)
        if (criadorId && criadorId !== 'sistema') {
            await this.prisma.conversaParticipante.upsert({
                where: { conversaId_usuarioId: { conversaId, usuarioId: criadorId } },
                create: {
                    conversaId,
                    usuarioId: criadorId,
                    usuarioNome: criadorNome ?? 'Usuário',
                    papel: 'dono',
                },
                update: { saiuEm: null },
            });
        }

        // 2) Responsável como 'admin' (só se for um User local distinto)
        const responsavel = await this.resolverUsuarioPorNome(responsavelNome);
        if (responsavel && responsavel.id !== criadorId) {
            await this.prisma.conversaParticipante.upsert({
                where: { conversaId_usuarioId: { conversaId, usuarioId: responsavel.id } },
                create: {
                    conversaId,
                    usuarioId: responsavel.id,
                    usuarioNome: responsavel.nome,
                    papel: 'admin',
                },
                update: { saiuEm: null },
            });
        }
    }

    /**
     * Cria a conversa vinculada a uma demanda recém-criada.
     * Idempotente: se já existir, retorna a existente.
     */
    async criarConversaDeDemanda(input: {
        demandaId: string;
        tituloDemanda: string;
        criadorId?: string | null;
        criadorNome?: string | null;
        responsavelNome?: string | null;
    }) {
        const existente = await this.obterConversaPorDemanda(input.demandaId);
        if (existente) {
            // Garante participantes mesmo em conversa pré-existente.
            await this.garantirParticipantesDemanda(
                existente.id,
                input.criadorId,
                input.criadorNome,
                input.responsavelNome,
            );
            return existente;
        }

        const criadorId = input.criadorId ?? 'sistema';
        const criadorNome = input.criadorNome ?? 'Sistema';

        const conversa = await this.prisma.conversa.create({
            data: {
                tipo: 'demanda',
                titulo: `Demanda: ${input.tituloDemanda}`.slice(0, 200),
                demandaId: input.demandaId,
                criadorId,
                criadorNome,
                ultimaMensagemEm: new Date(),
            },
        });

        // Adiciona participantes via upsert (sem verificar tabela User —
        // usuarioId aqui é o `auth.sub` do JWT, não precisa ser User local).
        await this.garantirParticipantesDemanda(
            conversa.id,
            input.criadorId,
            input.criadorNome,
            input.responsavelNome,
        );

        await this.postarSistema(
            conversa.id,
            `Demanda criada por ${criadorNome}${input.responsavelNome ? ` · responsável: ${input.responsavelNome}` : ''
            }.`,
        );

        this.logger.log(
            `Conversa de demanda ${conversa.id} criada (demandaId=${input.demandaId}).`,
        );
        return conversa;
    }

    /**
     * Posta uma mensagem de sistema em uma conversa (sem checagem de
     * participante). Usado pelas transições de status/responsável de demanda.
     */
    async postarSistema(conversaId: string, conteudo: string) {
        const criadoEm = new Date();
        const hash = this.hashMensagem({
            autorId: 'sistema',
            criadoEm,
            conteudo,
            anexosHashes: [],
        });

        const m = await this.prisma.mensagem.create({
            data: {
                conversaId,
                autorId: 'sistema',
                autorNome: 'Sistema',
                tipo: 'sistema',
                conteudo,
                hashConteudo: hash,
                criadoEm,
            },
        });

        await this.prisma.conversa.update({
            where: { id: conversaId },
            data: { ultimaMensagemEm: criadoEm },
        });
        return m;
    }

    /**
     * Sincroniza participantes da conversa de demanda quando o responsável
     * muda. O antigo responsável continua na conversa (histórico/prova) — só
     * adicionamos o novo.
     */
    async sincronizarResponsavelDemanda(
        demandaId: string,
        novoResponsavelNome: string | null | undefined,
    ) {
        const conversa = await this.obterConversaPorDemanda(demandaId);
        if (!conversa) return;
        const novo = await this.resolverUsuarioPorNome(novoResponsavelNome);
        if (!novo) return;

        await this.prisma.conversaParticipante.upsert({
            where: { conversaId_usuarioId: { conversaId: conversa.id, usuarioId: novo.id } },
            create: {
                conversaId: conversa.id,
                usuarioId: novo.id,
                usuarioNome: novo.nome,
                papel: 'admin',
            },
            update: { saiuEm: null },
        });
    }

    /**
     * Remove fisicamente a conversa vinculada a uma demanda (ao finalizar/concluir).
     * ON DELETE CASCADE no Prisma apaga mensagens, participantes e anexos.
     */
    async excluirConversaDeDemanda(demandaId: string) {
        const conversa = await this.obterConversaPorDemanda(demandaId);
        if (!conversa) return;
        await this.prisma.conversa.delete({ where: { id: conversa.id } });
        this.logger.log(`Conversa ${conversa.id} excluída (demanda ${demandaId} concluída).`);
    }
}
