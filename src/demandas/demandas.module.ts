import { Module } from '@nestjs/common';
import { DemandasService } from './demandas.service.js';
import { DemandasController } from './demandas.controller.js';
import { ConversasModule } from '../conversas/conversas.module.js';
import { NotificacoesModule } from '../notificacoes/notificacoes.module.js';

@Module({
    imports: [ConversasModule, NotificacoesModule],
    controllers: [DemandasController],
    providers: [DemandasService],
    exports: [DemandasService],
})
export class DemandasModule { }
