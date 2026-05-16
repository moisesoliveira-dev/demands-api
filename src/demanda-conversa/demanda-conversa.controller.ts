import {
    Body, Controller, Get, Param, Post, Query, Req, Sse,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { map, Observable } from 'rxjs';
import { DemandaConversaService } from './demanda-conversa.service.js';
import { AiService } from '../ai/ai.service.js';
import { DemandasService } from '../demandas/demandas.service.js';
import { CurrentUser, Public, RequirePermissions, type AuthUserPayload } from '../common/auth.decorators.js';

interface AuthedRequest { headers: { authorization?: string } }

interface CreateBody { conteudo: string; }

@ApiTags('demanda-conversa')
@ApiBearerAuth('access-token')
@Controller('demandas/:id/conversa')
export class DemandaConversaController {
    constructor(
        private readonly conversa: DemandaConversaService,
        private readonly ai: AiService,
        private readonly demandas: DemandasService,
        private readonly jwt: JwtService,
    ) { }

    @Get()
    @RequirePermissions('demandas.visualizar')
    list(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
        return this.conversa.list(id, user);
    }

    @Post()
    @RequirePermissions('demandas.comentar')
    create(@Param('id') id: string, @Body() body: CreateBody, @CurrentUser() user: AuthUserPayload) {
        return this.conversa.create(id, body.conteudo, user);
    }

    /**
     * SSE stream — EventSource não suporta headers, então o token vai por query.
     * Marcado como Public para pular o JwtAuthGuard global; validamos o token aqui.
     */
    @Sse('stream')
    @Public()
    async stream(
        @Param('id') id: string,
        @Query('access_token') token: string,
    ): Promise<Observable<{ data: unknown }>> {
        if (!token) throw new UnauthorizedException('access_token obrigatório');
        let user: AuthUserPayload;
        try {
            user = await this.jwt.verifyAsync<AuthUserPayload>(token);
        } catch {
            throw new UnauthorizedException('Token inválido');
        }
        await this.conversa.assertAccess(id, user);
        return this.conversa.streamFor(id).pipe(map((msg) => ({ data: msg })));
    }

    /**
     * Reestrutura a demanda usando a IA com base na conversa registrada.
     * Restrita ao criador ou admin (responsável apenas comenta).
     */
    @Post('reestruturar')
    @RequirePermissions('demandas.editar')
    async reestruturar(
        @Param('id') id: string,
        @CurrentUser() user: AuthUserPayload,
        @Req() req: AuthedRequest,
    ) {
        await this.conversa.assertAccess(id, user);
        const demanda = await this.demandas.byId(id);
        const mensagens = await this.conversa.list(id, user);

        const authHeader = req.headers.authorization ?? '';
        const result = (await this.ai.proxy(
            '/api/demandas/reestruturar',
            'POST',
            authHeader,
            {
                demanda: {
                    id: demanda.id,
                    titulo: demanda.titulo,
                    descricao: demanda.descricao,
                    setor: demanda.setor,
                    prioridade: demanda.prioridade,
                },
                mensagens: mensagens.map((m) => ({
                    autor: m.autorNome,
                    autor_role: m.autorRole,
                    conteudo: m.conteudo,
                    data: m.criadoEm,
                })),
            },
        )) as { titulo: string; descricao: string; prioridade?: number; resumo_mudanca?: string };

        const updated = await this.demandas.update(
            id,
            {
                titulo: result.titulo,
                descricao: result.descricao,
                ...(typeof result.prioridade === 'number' && {
                    prioridade: result.prioridade as 1 | 2 | 3 | 4 | 5,
                }),
            },
            user,
        );

        await this.conversa.createSystem(
            id,
            `🤖 Demanda reestruturada pela IA com base na conversa.\n\n${result.resumo_mudanca || 'Título e descrição atualizados.'}`,
            'ia',
        );

        return updated;
    }
}
