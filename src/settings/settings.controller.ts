import { Body, Controller, Get, HttpCode, Put, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { UpdateCompanyDto } from './dto/settings.dto.js';
import { RequirePermissions } from '../common/auth.decorators.js';

interface AuthedRequest {
    user?: { sub?: string; email?: string };
}

@ApiTags('settings')
@ApiBearerAuth('access-token')
@Controller('admin/settings')
export class SettingsController {
    constructor(private readonly settings: SettingsService) { }

    @Get()
    getAll() {
        return this.settings.getAll();
    }

    @Put('company')
    @HttpCode(200)
    @RequirePermissions('configuracoes.sistema')
    updateCompany(@Request() req: AuthedRequest, @Body() dto: UpdateCompanyDto) {
        const uid = req.user?.sub ?? req.user?.email ?? '';
        return this.settings.updateCompany(dto, uid);
    }
}
