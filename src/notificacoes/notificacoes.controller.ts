import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service.js';
import { CreateNotificacaoDto } from './dto/notificacoes.dto.js';
import { CurrentUser, RequirePermissions, type AuthUserPayload } from '../common/auth.decorators.js';

@Controller('notificacoes')
export class NotificacoesController {
    constructor(private readonly service: NotificacoesService) { }

    @Get()
    list(@CurrentUser() user: AuthUserPayload) {
        return this.service.list(user.sub);
    }

    @Get('contador')
    contador(@CurrentUser() user: AuthUserPayload) {
        return { naoLidas: this.service.contadorNaoLidas(user.sub) };
    }

    @Post()
    @RequirePermissions('notificacoes.gerenciar')
    create(@Body() dto: CreateNotificacaoDto) {
        return this.service.add(dto);
    }

    @Patch(':id/lida')
    marcarLida(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
        return this.service.marcarLida(id, user.sub);
    }

    @Patch('todas/lidas')
    marcarTodas(@CurrentUser() user: AuthUserPayload) {
        return this.service.marcarTodasLidas(user.sub);
    }

    @Delete()
    @HttpCode(204)
    limpar(@CurrentUser() user: AuthUserPayload) {
        this.service.limpar(user.sub);
    }

    @Delete(':id')
    @HttpCode(204)
    async remover(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
        await this.service.remover(id, user.sub);
    }
}
