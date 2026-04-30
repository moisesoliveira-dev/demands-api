import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Public, CurrentUser, type AuthUserPayload } from '../common/auth.decorators.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Public()
    @Post('login')
    @HttpCode(200)
    login(@Body() dto: LoginDto) {
        return this.auth.login(dto.email, dto.senha);
    }

    @Get('me')
    me(@CurrentUser() user: AuthUserPayload) {
        return this.auth.me(user.sub);
    }

    @Post('logout')
    @HttpCode(204)
    logout() {
        // Stateless JWT — client just discards token
        return;
    }
}
