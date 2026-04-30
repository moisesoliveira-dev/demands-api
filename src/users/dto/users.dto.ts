import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Permission, Role } from '../../common/permissions.js';

const ROLES: Role[] = ['admin', 'supervisor', 'operador', 'visualizador'];

export class CreateUserDto {
    @IsString() @MinLength(2)
    nome!: string;

    @IsEmail()
    email!: string;

    @IsString() @MinLength(6)
    senha!: string;

    @IsString()
    cargo!: string;

    @IsString()
    setor!: string;

    @IsIn(ROLES)
    role!: Role;

    @IsOptional() @IsArray()
    customPermissions?: Permission[];
}

export class UpdateUserDto {
    @IsOptional() @IsString() @MinLength(2)
    nome?: string;

    @IsOptional() @IsEmail()
    email?: string;

    @IsOptional() @IsString()
    cargo?: string;

    @IsOptional() @IsString()
    setor?: string;

    @IsOptional() @IsIn(ROLES)
    role?: Role;

    @IsOptional() @IsArray()
    customPermissions?: Permission[];

    @IsOptional() @IsBoolean()
    ativo?: boolean;
}

export class ToggleAtivoDto {
    @IsBoolean()
    ativo!: boolean;
}
