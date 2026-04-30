import { Module } from '@nestjs/common';
import { RelatoriosController } from './relatorios.controller.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';

@Module({
    imports: [DashboardModule],
    controllers: [RelatoriosController],
})
export class RelatoriosModule { }
