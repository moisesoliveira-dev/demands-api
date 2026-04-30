import { Module } from '@nestjs/common';
import { DemandasService } from './demandas.service.js';
import { DemandasController } from './demandas.controller.js';

@Module({
    controllers: [DemandasController],
    providers: [DemandasService],
    exports: [DemandasService],
})
export class DemandasModule { }
