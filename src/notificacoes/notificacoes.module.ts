import { Module } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service.js';
import { NotificacoesController } from './notificacoes.controller.js';

@Module({
    controllers: [NotificacoesController],
    providers: [NotificacoesService],
    exports: [NotificacoesService],
})
export class NotificacoesModule { }
