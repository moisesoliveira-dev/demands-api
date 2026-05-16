import { Module } from '@nestjs/common';
import { DemandaConversaService } from './demanda-conversa.service.js';
import { DemandaConversaController } from './demanda-conversa.controller.js';
import { AiModule } from '../ai/ai.module.js';
import { DemandasModule } from '../demandas/demandas.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
    imports: [AiModule, DemandasModule, AuthModule],
    controllers: [DemandaConversaController],
    providers: [DemandaConversaService],
})
export class DemandaConversaModule { }
