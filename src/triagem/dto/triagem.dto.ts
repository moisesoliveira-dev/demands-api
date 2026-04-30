import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const STEPS = ['descricao', 'setor', 'responsavel', 'prioridade', 'confirmacao', 'criada'] as const;
export type StepDto = (typeof STEPS)[number];

export class UpdateSessionDto {
    @IsOptional() @IsString()
    titulo?: string;

    @IsOptional() @IsIn(STEPS)
    step?: StepDto;

    @IsOptional()
    draft?: {
        titulo?: string;
        descricao?: string;
        setor?: string;
        responsavel?: string;
        prioridade?: 1 | 2 | 3 | 4 | 5;
    };

    @IsOptional() @IsArray()
    messages?: Array<{
        id: string;
        role: 'agent' | 'user';
        content: string;
        timestamp: string;
        suggestions?: string[];
        summary?: Record<string, unknown>;
    }>;

    @IsOptional() @IsIn(['andamento', 'criada'])
    status?: 'andamento' | 'criada';
}

export class ReplyDto {
    @IsString()
    texto!: string;
}

export class ConfirmarDto {
    @IsString() titulo!: string;
    @IsString() descricao!: string;
    @IsString() setor!: string;
    @IsString() responsavel!: string;
    @IsInt() @Min(1) @Max(5)
    prioridade!: 1 | 2 | 3 | 4 | 5;
}
