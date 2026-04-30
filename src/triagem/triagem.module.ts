import { Module } from '@nestjs/common';
import { TriagemService } from './triagem.service.js';
import { TriagemController } from './triagem.controller.js';
import { DemandasModule } from '../demandas/demandas.module.js';

@Module({
    imports: [DemandasModule],
    controllers: [TriagemController],
    providers: [TriagemService],
})
export class TriagemModule { }
