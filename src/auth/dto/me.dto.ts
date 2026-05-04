import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
    @IsOptional() @IsString() @MaxLength(120)
    nome?: string;

    @IsOptional() @IsEmail()
    email?: string;

    @IsOptional() @IsString() @MaxLength(120)
    cargo?: string;

    @IsOptional() @IsString() @MaxLength(2048)
    avatar?: string;

    @IsOptional() @IsString() @MaxLength(2048)
    avatarUrl?: string;
}

export class AlterarSenhaDto {
    @IsString() @MinLength(4)
    senhaAtual!: string;

    @IsString() @MinLength(4)
    novaSenha!: string;
}

export class Verificar2FADto {
    @IsString()
    challengeToken!: string;

    @IsString() @MinLength(4) @MaxLength(8)
    codigo!: string;
}

export class Reenviar2FADto {
    @IsString()
    challengeToken!: string;
}
