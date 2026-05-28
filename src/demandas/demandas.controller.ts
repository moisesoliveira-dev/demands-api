import {
    Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DemandasService } from './demandas.service.js';
import {
    CreateDemandaDto, ListDemandasQueryDto, ReordenarDto, UpdateDemandaDto, UpdateStatusDto,
} from './dto/demandas.dto.js';
import { CurrentUser, RequirePermissions, type AuthUserPayload } from '../common/auth.decorators.js';

@ApiTags('demandas')
@ApiBearerAuth('access-token')
@Controller('demandas')
export class DemandasController {
    constructor(private readonly service: DemandasService) { }

    @Get()
    @RequirePermissions('demandas.visualizar')
    list(@Query() query: ListDemandasQueryDto) {
        return this.service.list(query);
    }

    @Get('recorrentes')
    @RequirePermissions('demandas.visualizar')
    recorrentes() {
        return this.service.recorrentes();
    }

    @Get(':id')
    @RequirePermissions('demandas.visualizar')
    byId(@Param('id') id: string) {
        return this.service.byId(id);
    }

    @Get(':id/historico')
    @RequirePermissions('auditoria.visualizar')
    historico(@Param('id') id: string) {
        return this.service.historico(id);
    }

    @Post()
    @RequirePermissions('demandas.criar')
    create(@Body() dto: CreateDemandaDto, @CurrentUser() user: AuthUserPayload) {
        return this.service.create(dto, user);
    }

    @Patch(':id')
    @RequirePermissions('demandas.editar')
    update(@Param('id') id: string, @Body() dto: UpdateDemandaDto, @CurrentUser() user: AuthUserPayload) {
        return this.service.update(id, dto, user);
    }

    @Patch(':id/status')
    @RequirePermissions('demandas.mudar_status')
    updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: AuthUserPayload) {
        return this.service.updateStatus(id, dto, user);
    }

    @Put('reordenar')
    @RequirePermissions('kanban.reorganizar')
    reordenar(@Body() dto: ReordenarDto) {
        return this.service.reordenar(dto.ids);
    }

    @Delete(':id')
    @RequirePermissions('demandas.excluir')
    @HttpCode(204)
    remove(@Param('id') id: string) {
        this.service.remove(id);
    }
}
