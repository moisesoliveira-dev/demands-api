import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSetorDto {
    @IsString() @MinLength(2)
    nome!: string;

    @IsOptional() @IsString()
    descricao?: string;

    @IsString()
    responsavel!: string;

    @IsOptional() @IsBoolean()
    ativo?: boolean;
}

export class UpdateSetorDto {
    @IsOptional() @IsString() @MinLength(2)
    nome?: string;

    @IsOptional() @IsString()
    descricao?: string;

    @IsOptional() @IsString()
    responsavel?: string;

    @IsOptional() @IsBoolean()
    ativo?: boolean;
}
