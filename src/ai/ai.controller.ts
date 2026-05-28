import {
    Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Request,
    UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service.js';

interface AuthedRequest {
    headers: { authorization?: string };
}

interface UploadedMulterFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}

function bearerOf(req: AuthedRequest): string {
    return req.headers.authorization ?? '';
}

@ApiTags('ai')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
    constructor(private readonly ai: AiService) { }

    @Get('health')
    health(@Request() req: AuthedRequest) {
        return this.ai.proxy('/health', 'GET', bearerOf(req));
    }

    @Post('relatorios/periodo')
    @HttpCode(200)
    relatorioPeriodo(@Request() req: AuthedRequest, @Body() body: unknown) {
        return this.ai.proxy('/api/relatorios/periodo', 'POST', bearerOf(req), body);
    }

    @Post('relatorios/perguntar')
    @HttpCode(200)
    relatoriosPerguntar(@Request() req: AuthedRequest, @Body() body: unknown) {
        return this.ai.proxy('/api/relatorios/perguntar', 'POST', bearerOf(req), body);
    }

    // ─── Triagem conversacional ──────────────────────────────────────────────

    @Get('triagem/recorrentes')
    triagemRecorrentes(@Request() req: AuthedRequest) {
        return this.ai.proxy('/api/triagem/recorrentes', 'GET', bearerOf(req));
    }

    @Get('triagem/sessions')
    listTriagemSessions(@Request() req: AuthedRequest) {
        return this.ai.proxy('/api/triagem/sessions', 'GET', bearerOf(req));
    }

    @Post('triagem/sessions')
    @HttpCode(201)
    createTriagemSession(@Request() req: AuthedRequest, @Body() body: unknown) {
        return this.ai.proxy('/api/triagem/sessions', 'POST', bearerOf(req), body);
    }

    @Get('triagem/sessions/:id')
    getTriagemSession(@Request() req: AuthedRequest, @Param('id') id: string) {
        return this.ai.proxy(`/api/triagem/sessions/${id}`, 'GET', bearerOf(req));
    }

    @Delete('triagem/sessions/:id')
    @HttpCode(204)
    deleteTriagemSession(@Request() req: AuthedRequest, @Param('id') id: string) {
        return this.ai.proxy(`/api/triagem/sessions/${id}`, 'DELETE', bearerOf(req));
    }

    @Post('triagem/sessions/:id/message')
    @HttpCode(200)
    sendTriagemMessage(
        @Request() req: AuthedRequest,
        @Param('id') id: string,
        @Body() body: unknown,
    ) {
        return this.ai.proxy(`/api/triagem/sessions/${id}/message`, 'POST', bearerOf(req), body);
    }

    @Post('triagem/sessions/:id/criar')
    @HttpCode(200)
    confirmarTriagem(
        @Request() req: AuthedRequest,
        @Param('id') id: string,
        @Body() body: unknown,
    ) {
        return this.ai.proxy(`/api/triagem/sessions/${id}/criar`, 'POST', bearerOf(req), body);
    }

    @Post('triagem/auto-draft')
    @HttpCode(200)
    autoDraft(
        @Request() req: AuthedRequest,
        @Body() body: { description: string },
    ) {
        return this.ai.proxy('/api/triagem/auto-draft', 'POST', bearerOf(req), body);
    }

    @Post('agents/:agentId/run')
    @HttpCode(200)
    runAgent(
        @Request() req: AuthedRequest,
        @Param('agentId') agentId: string,
        @Body() body: unknown,
    ) {
        return this.ai.proxy(`/api/agents/${agentId}/run`, 'POST', bearerOf(req), body);
    }

    @Post('teams/:teamId/run')
    @HttpCode(200)
    runTeam(
        @Request() req: AuthedRequest,
        @Param('teamId') teamId: string,
        @Body() body: unknown,
    ) {
        return this.ai.proxy(`/api/teams/${teamId}/run`, 'POST', bearerOf(req), body);
    }

    // ─── Admin: Configuração / Métricas / Conhecimento ───────────────────────

    @Get('admin/config')
    getAiConfig(@Request() req: AuthedRequest) {
        return this.ai.proxy('/api/ai/config', 'GET', bearerOf(req));
    }

    @Put('admin/config')
    @HttpCode(200)
    updateAiConfig(@Request() req: AuthedRequest, @Body() body: unknown) {
        return this.ai.proxy('/api/ai/config', 'PUT', bearerOf(req), body);
    }

    @Get('admin/metrics')
    getAiMetrics(@Request() req: AuthedRequest, @Query('days') days?: string) {
        const q = days ? `?days=${encodeURIComponent(days)}` : '';
        return this.ai.proxy(`/api/ai/metrics${q}`, 'GET', bearerOf(req));
    }

    @Get('admin/knowledge')
    listKnowledge(@Request() req: AuthedRequest) {
        return this.ai.proxy('/api/ai/knowledge', 'GET', bearerOf(req));
    }

    @Post('admin/knowledge')
    @HttpCode(201)
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
    uploadKnowledge(
        @Request() req: AuthedRequest,
        @UploadedFile() file: UploadedMulterFile,
        @Body() body: { setor?: string } = {},
    ) {
        return this.ai.proxyUpload('/api/ai/knowledge', bearerOf(req), file, 'file', { setor: body.setor });
    }

    @Delete('admin/knowledge/:id')
    @HttpCode(204)
    deleteKnowledge(@Request() req: AuthedRequest, @Param('id') id: string) {
        return this.ai.proxy(`/api/ai/knowledge/${id}`, 'DELETE', bearerOf(req));
    }

    // ─── Perfil & Memórias (Fase 2) ──────────────────────────────────────────

    @Get('admin/profile')
    getProfile(@Request() req: AuthedRequest) {
        return this.ai.proxy('/api/ai/profile', 'GET', bearerOf(req));
    }

    @Put('admin/profile')
    @HttpCode(200)
    updateProfile(@Request() req: AuthedRequest, @Body() body: unknown) {
        return this.ai.proxy('/api/ai/profile', 'PUT', bearerOf(req), body);
    }

    @Get('admin/memories')
    listMemories(@Request() req: AuthedRequest, @Query('limit') limit?: string) {
        const q = limit ? `?limit=${encodeURIComponent(limit)}` : '';
        return this.ai.proxy(`/api/ai/memories${q}`, 'GET', bearerOf(req));
    }

    @Delete('admin/memories/:id')
    @HttpCode(204)
    deleteMemory(@Request() req: AuthedRequest, @Param('id') id: string) {
        return this.ai.proxy(`/api/ai/memories/${id}`, 'DELETE', bearerOf(req));
    }

    @Delete('admin/memories')
    @HttpCode(200)
    clearMemories(@Request() req: AuthedRequest) {
        return this.ai.proxy('/api/ai/memories', 'DELETE', bearerOf(req));
    }
}

