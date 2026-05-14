import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SetoresService } from './setores.service.js';
import { CreateSetorDto, UpdateSetorDto } from './dto/setores.dto.js';
import { RequirePermissions } from '../common/auth.decorators.js';

@ApiTags('setores')
@ApiBearerAuth('access-token')
@Controller('setores')
export class SetoresController {
    constructor(private readonly setores: SetoresService) { }

    @Get()
    list() {
        return this.setores.list();
    }

    @Get(':id')
    byId(@Param('id') id: string) {
        return this.setores.byId(id);
    }

    @Post()
    @RequirePermissions('configuracoes.setores')
    create(@Body() dto: CreateSetorDto) {
        return this.setores.create(dto);
    }

    @Patch(':id')
    @RequirePermissions('configuracoes.setores')
    update(@Param('id') id: string, @Body() dto: UpdateSetorDto) {
        return this.setores.update(id, dto);
    }

    @Delete(':id')
    @RequirePermissions('configuracoes.setores')
    @HttpCode(204)
    remove(@Param('id') id: string) {
        this.setores.remove(id);
    }
}
