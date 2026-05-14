import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TriagemService } from './triagem.service.js';
import { ConfirmarDto, ReplyDto, UpdateSessionDto } from './dto/triagem.dto.js';
import { CurrentUser, RequirePermissions, type AuthUserPayload } from '../common/auth.decorators.js';

@ApiTags('triagem')
@ApiBearerAuth('access-token')
@Controller('triagem/sessions')
export class TriagemController {
    constructor(private readonly service: TriagemService) { }

    @Get()
    @RequirePermissions('demandas.criar')
    list(@CurrentUser() user: AuthUserPayload) {
        return this.service.list(user.sub);
    }

    @Get(':id')
    @RequirePermissions('demandas.criar')
    byId(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
        return this.service.get(id, user.sub);
    }

    @Post()
    @RequirePermissions('demandas.criar')
    create(@CurrentUser() user: AuthUserPayload) {
        return this.service.create(user.sub);
    }

    @Patch(':id')
    @RequirePermissions('demandas.criar')
    update(@Param('id') id: string, @Body() dto: UpdateSessionDto, @CurrentUser() user: AuthUserPayload) {
        return this.service.update(id, user.sub, dto);
    }

    @Post(':id/reply')
    @RequirePermissions('demandas.criar')
    reply(@Param('id') id: string, @Body() dto: ReplyDto, @CurrentUser() user: AuthUserPayload) {
        return this.service.reply(id, user.sub, dto.texto);
    }

    @Post(':id/confirmar')
    @RequirePermissions('demandas.criar')
    confirmar(@Param('id') id: string, @Body() dto: ConfirmarDto, @CurrentUser() user: AuthUserPayload) {
        return this.service.confirmar(id, user.sub, dto, user);
    }

    @Delete(':id')
    @RequirePermissions('demandas.criar')
    @HttpCode(204)
    remove(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
        this.service.remove(id, user.sub);
    }
}
