import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateNotificacaoDto {
    @IsOptional() @IsString()
    usuarioId?: string;

    @IsOptional() @IsString()
    demandaId?: string;

    @IsString()
    titulo!: string;

    @IsString()
    mensagem!: string;

    @IsInt() @Min(1) @Max(5)
    prioridade!: 1 | 2 | 3 | 4 | 5;
}
