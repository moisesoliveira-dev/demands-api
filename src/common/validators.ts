import { applyDecorators } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

/** Valida prioridade 1..5 (obrigatório). Equivalente a `@IsInt() @Min(1) @Max(5)`. */
export function IsPrioridade(): PropertyDecorator {
    return applyDecorators(IsInt(), Min(1), Max(5));
}

/** Valida prioridade 1..5 (opcional). Equivalente a `@IsOptional() @IsInt() @Min(1) @Max(5)`. */
export function IsOptionalPrioridade(): PropertyDecorator {
    return applyDecorators(IsOptional(), IsInt(), Min(1), Max(5));
}

/** Valida nome curto (≥2). */
export function IsNome(): PropertyDecorator {
    return applyDecorators(IsString(), MinLength(2));
}

/** Valida título médio (≥3). */
export function IsTitulo(): PropertyDecorator {
    return applyDecorators(IsString(), MinLength(3));
}
