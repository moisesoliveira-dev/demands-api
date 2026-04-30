import {
    ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export const DEMAND_STATUS = ['pendente', 'em_andamento', 'concluido', 'bloqueado'] as const;
export type DemandStatusDto = (typeof DEMAND_STATUS)[number];

export class CreateDemandaDto {
    @IsString() @MinLength(3)
    titulo!: string;

    @IsString()
    descricao!: string;

    @IsInt() @Min(1) @Max(5)
    prioridade!: 1 | 2 | 3 | 4 | 5;

    @IsIn(DEMAND_STATUS)
    status!: DemandStatusDto;

    @IsString()
    setor!: string;

    @IsString()
    responsavel!: string;

    @IsOptional() @IsString()
    motivoBloqueio?: string;
}

export class UpdateDemandaDto {
    @IsOptional() @IsString() @MinLength(3)
    titulo?: string;

    @IsOptional() @IsString()
    descricao?: string;

    @IsOptional() @IsInt() @Min(1) @Max(5)
    prioridade?: 1 | 2 | 3 | 4 | 5;

    @IsOptional() @IsIn(DEMAND_STATUS)
    status?: DemandStatusDto;

    @IsOptional() @IsString()
    setor?: string;

    @IsOptional() @IsString()
    responsavel?: string;

    @IsOptional() @IsString()
    motivoBloqueio?: string;
}

export class UpdateStatusDto {
    @IsIn(DEMAND_STATUS)
    status!: DemandStatusDto;

    @IsOptional() @IsString()
    motivo?: string;
}

export class ReordenarDto {
    @IsArray() @ArrayMinSize(1) @IsString({ each: true })
    ids!: string[];
}

export class ListDemandasQueryDto {
    @IsOptional()
    @Type(() => String)
    @IsString({ each: true })
    status?: DemandStatusDto | DemandStatusDto[];

    @IsOptional()
    prioridade?: string | string[];

    @IsOptional()
    setor?: string | string[];

    @IsOptional()
    responsavel?: string | string[];

    @IsOptional() @IsString()
    busca?: string;

    @IsOptional() @IsString()
    dataInicio?: string;

    @IsOptional() @IsString()
    dataFim?: string;
}
