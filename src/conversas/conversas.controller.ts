import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConversasService } from './conversas.service.js';
import {
    AdicionarParticipanteDto,
    AtualizarConversaDto,
    EnviarMensagemDto,
} from './dto/conversas.dto.js';
import { CurrentUser, type AuthUserPayload } from '../common/auth.decorators.js';

function clientIp(req: Request): string | null {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0]?.trim() ?? null;
    return req.ip ?? null;
}

@ApiTags('conversas')
@ApiBearerAuth('access-token')
@Controller('conversas')
export class ConversasController {
    constructor(private readonly service: ConversasService) { }

    @Get()
    listar(@CurrentUser() user: AuthUserPayload) {
        return this.service.listarConversas(user);
    }

    @Get('usuarios')
    listarUsuarios(@CurrentUser() user: AuthUserPayload) {
        return this.service.listarUsuariosParaChat(user);
    }

    // Criação manual de conversas desativada — conversas são criadas automaticamente via demandas.

    @Get(':id')
    obter(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
        return this.service.obterConversa(id, user);
    }

    @Patch(':id')
    atualizar(
        @Param('id') id: string,
        @Body() dto: AtualizarConversaDto,
        @CurrentUser() user: AuthUserPayload,
    ) {
        return this.service.atualizarConversa(id, dto, user);
    }

    @Get(':id/mensagens')
    mensagens(
        @Param('id') id: string,
        @Query('antesDe') antesDe: string | undefined,
        @CurrentUser() user: AuthUserPayload,
    ) {
        return this.service.listarMensagens(id, user, antesDe);
    }

    @Post(':id/mensagens')
    @ApiConsumes('multipart/form-data', 'application/json')
    @UseInterceptors(FilesInterceptor('arquivos', 5, { limits: { fileSize: 100 * 1024 * 1024 } }))
    enviar(
        @Param('id') id: string,
        @Body() dto: EnviarMensagemDto,
        @UploadedFiles() arquivos: Express.Multer.File[] | undefined,
        @CurrentUser() user: AuthUserPayload,
        @Req() req: Request,
    ) {
        return this.service.enviarMensagem(id, dto, arquivos, user, {
            ip: clientIp(req),
            userAgent: req.headers['user-agent'] ?? null,
        });
    }

    @Post(':id/lida')
    @HttpCode(200)
    marcarLida(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
        return this.service.marcarLida(id, user);
    }

    @Delete('mensagens/:msgId')
    apagar(@Param('msgId') msgId: string, @CurrentUser() user: AuthUserPayload) {
        return this.service.apagarMensagem(msgId, user);
    }

    @Get('anexos/:anexoId')
    async baixarAnexo(
        @Param('anexoId') anexoId: string,
        @CurrentUser() user: AuthUserPayload,
        @Res() res: Response,
    ) {
        const { body, contentType, nomeOriginal, sha256, integridade } =
            await this.service.baixarAnexo(anexoId, user);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', String(body.length));
        res.setHeader('X-Content-SHA256', sha256);
        res.setHeader('X-Integrity-Ok', integridade ? '1' : '0');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(nomeOriginal)}"`,
        );
        res.send(body);
    }

    @Get('anexos/:anexoId/presign')
    presign(@Param('anexoId') anexoId: string, @CurrentUser() user: AuthUserPayload) {
        return this.service.presignAnexo(anexoId, user);
    }

    @Post(':id/participantes')
    adicionarParticipante(
        @Param('id') id: string,
        @Body() dto: AdicionarParticipanteDto,
        @CurrentUser() user: AuthUserPayload,
    ) {
        return this.service.adicionarParticipante(id, dto, user);
    }

    @Delete(':id/participantes/:usuarioId')
    removerParticipante(
        @Param('id') id: string,
        @Param('usuarioId') usuarioId: string,
        @CurrentUser() user: AuthUserPayload,
    ) {
        return this.service.removerParticipante(id, usuarioId, user);
    }
}
