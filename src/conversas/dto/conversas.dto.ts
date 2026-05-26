import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export type ConversaTipo = 'direto' | 'grupo' | 'demanda';

export class CreateConversaDto {
    @ApiProperty({ enum: ['direto', 'grupo'], description: '"direto" = 1:1, "grupo" = vários participantes' })
    @IsIn(['direto', 'grupo'])
    tipo!: 'direto' | 'grupo';

    @ApiPropertyOptional({ description: 'Obrigatório para grupos.' })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    titulo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    descricao?: string;

    @ApiProperty({ type: [String], description: 'IDs dos usuários. Para direto: 1 outro usuário. Para grupo: ≥1.' })
    @IsArray()
    @IsString({ each: true })
    participantes!: string[];
}

export class EnviarMensagemDto {
    @ApiPropertyOptional({ description: 'Texto ou legenda do anexo.' })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    conteudo?: string;

    @ApiPropertyOptional({ enum: ['texto', 'imagem', 'video'] })
    @IsOptional()
    @IsIn(['texto', 'imagem', 'video'])
    tipo?: 'texto' | 'imagem' | 'video';
}

export class AdicionarParticipanteDto {
    @ApiProperty()
    @IsString()
    usuarioId!: string;

    @ApiPropertyOptional({ enum: ['dono', 'admin', 'membro'] })
    @IsOptional()
    @IsIn(['dono', 'admin', 'membro'])
    papel?: 'dono' | 'admin' | 'membro';
}

export class AtualizarConversaDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    titulo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    descricao?: string;
}
