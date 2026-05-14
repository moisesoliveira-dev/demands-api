import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { RequirePermissions } from '../common/auth.decorators.js';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly service: DashboardService) { }

    @Get()
    @RequirePermissions('dashboard.visualizar')
    resumo() {
        return this.service.resumo();
    }

    @Get('serie')
    @RequirePermissions('dashboard.visualizar')
    serie(@Query('dias') dias?: string) {
        const n = Number(dias);
        return this.service.serieTemporal(Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 14);
    }
}
