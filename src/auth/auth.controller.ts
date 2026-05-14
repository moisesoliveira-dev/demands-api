import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
        return this.auth.login(dto.email, dto.senha);
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

    @Patch('me')
    async atualizarMe(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateMeDto) {
        return this.auth.atualizarMeuPerfil(user.sub, dto);
    }

    @Post('me/senha')
    @HttpCode(204)
    async alterarSenha(@CurrentUser() user: AuthUserPayload, @Body() dto: AlterarSenhaDto) {
        await this.auth.alterarSenha(user.sub, dto.senhaAtual, dto.novaSenha);
    }

    @Post('logout')
    @HttpCode(204)
    logout() {
        // Stateless JWT — client just discards token
        return;
    }
}
