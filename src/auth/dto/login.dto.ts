import { IsString, MinLength } from 'class-validator';

/**
 * DTO de login corporativo (banco `dbacesso`).
 * Mantém o padrão da empresa (campos `usua_login` / `usua_senha`).
 */
export class LoginDto {
    @IsString()
    @MinLength(1)
    usua_login!: string;

    @IsString()
    @MinLength(1)
    usua_senha!: string;
}
