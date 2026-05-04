import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const NOTIFICACAO_TIPOS = [
    'demanda_criada',
    'demanda_atualizada',
    'demanda_bloqueada',
    'demanda_concluida',
    'demanda_atribuida',
    'sistema',
    'alerta',
] as const;
export type NotificacaoTipoLiteral = (typeof NOTIFICACAO_TIPOS)[number];

export class CreateNotificacaoDto {
    @IsOptional() @IsString()
    usuarioId?: string;

    @IsOptional() @IsString()
    demandaId?: string;

    @IsOptional() @IsIn(NOTIFICACAO_TIPOS as readonly string[])
    tipo?: NotificacaoTipoLiteral;

    @IsString()
    titulo!: string;

    @IsString()
    mensagem!: string;

    @IsOptional() @IsInt() @Min(1) @Max(5)
    prioridade?: 1 | 2 | 3 | 4 | 5;

    @IsOptional() @IsString()
    acao?: string;
}
