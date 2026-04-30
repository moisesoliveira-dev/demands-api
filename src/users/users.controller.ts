import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto, ToggleAtivoDto, UpdateUserDto } from './dto/users.dto.js';
import { RequirePermissions } from '../common/auth.decorators.js';

@Controller('users')
export class UsersController {
    constructor(private readonly users: UsersService) { }

    @Get()
    @RequirePermissions('configuracoes.usuarios')
    list() {
        return this.users.list();
    }

    @Get(':id')
    @RequirePermissions('configuracoes.usuarios')
    byId(@Param('id') id: string) {
        return this.users.byId(id);
    }

    @Post()
    @RequirePermissions('configuracoes.usuarios')
    create(@Body() dto: CreateUserDto) {
        return this.users.create(dto);
    }

    @Patch(':id')
    @RequirePermissions('configuracoes.usuarios')
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.users.update(id, dto);
    }

    @Patch(':id/ativo')
    @RequirePermissions('configuracoes.usuarios')
    toggleAtivo(@Param('id') id: string, @Body() dto: ToggleAtivoDto) {
        return this.users.update(id, { ativo: dto.ativo });
    }

    @Delete(':id')
    @RequirePermissions('configuracoes.usuarios')
    @HttpCode(204)
    remove(@Param('id') id: string) {
        this.users.remove(id);
    }
}
