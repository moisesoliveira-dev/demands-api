import { Module } from '@nestjs/common';
import { SetoresService } from './setores.service.js';
import { SetoresController } from './setores.controller.js';

@Module({
    controllers: [SetoresController],
    providers: [SetoresService],
    exports: [SetoresService],
})
export class SetoresModule { }
