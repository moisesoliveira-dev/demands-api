import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AlterarSenhaDto, Reenviar2FADto, UpdateMeDto, Verificar2FADto } from './dto/me.dto.js';
import { Public, CurrentUser, type AuthUserPayload } from '../common/auth.decorators.js';

@ApiTags('auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Public()
    @Post('login')
    @HttpCode(200)
    login(@Body() dto: LoginDto) {
        return this.auth.login(dto.usua_login, dto.usua_senha);
    }

    /** Stub: 2FA não habilitado nesta build. Retorna 501. */
    @Public()
    @Post('2fa/verificar')
    @HttpCode(501)
    verificar2FA(@Body() _dto: Verificar2FADto) {
        throw new HttpException('2FA não habilitado', HttpStatus.NOT_IMPLEMENTED);
    }

    @Public()
    @Post('2fa/reenviar')
    @HttpCode(501)
    reenviar2FA(@Body() _dto: Reenviar2FADto) {
        throw new HttpException('2FA não habilitado', HttpStatus.NOT_IMPLEMENTED);
    }

    @Get('me')
    me(@CurrentUser() user: AuthUserPayload) {
        return this.auth.me(user.sub);
    }

    /** Edição de perfil não suportada — dados vêm do dbacesso (somente leitura). */
    @Patch('me')
    atualizarMe(@CurrentUser() _user: AuthUserPayload, @Body() _dto: UpdateMeDto) {
        throw new HttpException(
            'Perfil gerenciado pelo dbacesso (somente leitura). Solicite alterações ao administrador.',
            HttpStatus.NOT_IMPLEMENTED,
        );
    }

    /** Troca de senha indisponível — senha gerenciada no dbacesso. */
    @Post('me/senha')
    @HttpCode(HttpStatus.NOT_IMPLEMENTED)
    alterarSenha(@CurrentUser() _user: AuthUserPayload, @Body() _dto: AlterarSenhaDto) {
        throw new HttpException(
            'Senha gerenciada pelo dbacesso — use o portal corporativo.',
            HttpStatus.NOT_IMPLEMENTED,
        );
    }

    @Post('logout')
    @HttpCode(204)
    logout() {
        // Stateless JWT — client just discards token
        return;
    }
}
