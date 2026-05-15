import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbacessoService } from './dbacesso.service.js';
import { UsuarioCorpService } from './usuario.service.js';
import { UsuarioSistemaCorpService } from './usuario-sistema.service.js';
import { MenuUsuarioCorpService } from './menu-usuario.service.js';

/**
 * Módulo de acesso ao banco corporativo `dbacesso` (somente leitura).
 *
 * Padrão inspirado em `dgb_mes_wce/back-end/src/app/dbacesso/*`.
 * Usado para autenticação e autorização — fonte única de verdade dos
 * usuários, perfis e permissões da empresa.
 */
@Module({
    imports: [ConfigModule],
    providers: [
        DbacessoService,
        UsuarioCorpService,
        UsuarioSistemaCorpService,
        MenuUsuarioCorpService,
    ],
    exports: [
        DbacessoService,
        UsuarioCorpService,
        UsuarioSistemaCorpService,
        MenuUsuarioCorpService,
    ],
})
export class DbacessoModule { }
