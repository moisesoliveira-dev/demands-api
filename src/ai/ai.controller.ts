import {
    Body, Controller, Get, HttpCode, Param, Post, Request,
} from '@nestjs/common';
import { AiService } from './ai.service.js';

interface AuthedRequest {
    headers: { authorization?: string };
}

function bearerOf(req: AuthedRequest): string {
    return req.headers.authorization ?? '';
}

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

    @Post('triagem/sugestao')
    @HttpCode(200)
    triagemSugestao(@Request() req: AuthedRequest, @Body() body: unknown) {
        return this.ai.proxy('/api/triagem/sugestao', 'POST', bearerOf(req), body);
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
}
