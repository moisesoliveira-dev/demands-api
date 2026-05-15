import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsuarioCorpService } from '../dbacesso/usuario.service.js';
import { UsuarioSistemaCorpService } from '../dbacesso/usuario-sistema.service.js';
import { MenuUsuarioCorpService } from '../dbacesso/menu-usuario.service.js';
import { resolvePermissions, type Role } from '../common/permissions.js';
import type { UsuarioRow } from '../dbacesso/types.js';

/**
 * Serviço de autenticação corporativa.
 *
 * Toda autenticação passa pelo banco `dbacesso` (somente leitura):
 *   1. Localiza usuário pela coluna `usua_login`.
 *   2. Confere a senha contra `usua_senha` (texto puro — padrão da empresa).
 *   3. Valida que o usuário possui acesso ao sistema atual via `usuario_sistema`.
 *   4. Carrega menus desse sistema para o usuário.
 *   5. Emite JWT com payload corporativo.
 *
 * NÃO mantém contas locais. Se o usuário/sistema/menus não existirem no
 * `dbacesso`, o login falha — sem bypass.
 */
@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly usuarios: UsuarioCorpService,
        private readonly usuariosSistema: UsuarioSistemaCorpService,
        private readonly menus: MenuUsuarioCorpService,
        private readonly jwt: JwtService,
        private readonly cfg: ConfigService,
    ) { }

    private idSistema(): number {
        const raw = this.cfg.get<string>('ID_SISTEMA');
        const id = Number(raw);
        if (!raw || !Number.isInteger(id) || id <= 0) {
            this.logger.warn('401 login: ID_SISTEMA inválido ou ausente');
            throw new UnauthorizedException(
                'ID_SISTEMA não configurado no servidor — defina a variável de ambiente.',
            );
        }
        return id;
    }

    private throw401(message: string, details?: Record<string, unknown>): never {
        if (details) {
            this.logger.warn(`401 auth: ${message} ${JSON.stringify(details)}`);
        } else {
            this.logger.warn(`401 auth: ${message}`);
        }
        throw new UnauthorizedException(message);
    }

    async login(usua_login: string, usua_senha: string) {
        const idSistema = this.idSistema();

        const user = await this.usuarios.findByLogin(usua_login);
        if (!user) this.throw401('Credenciais inválidas', { usua_login, motivo: 'usuario_nao_encontrado' });

        // padrão dgb_mes_wce: comparação em texto puro contra usua_senha
        if (user.usua_senha !== usua_senha) {
            this.throw401('Credenciais inválidas', { usua_login, usua_id: user.usua_id, motivo: 'senha_invalida' });
        }

        const userStatus = String(user.usua_status ?? '').trim();
        if (userStatus !== '1') {
            this.throw401('Usuário inativo', { usua_login, usua_id: user.usua_id, userStatus });
        }

        const acesso = await this.usuariosSistema.findOneByUserAndSystem(user.usua_id, idSistema);
        const acessoStatus = Number((acesso as any)?.ussi_status ?? -1);
        if (!acesso || acessoStatus !== 1) {
            this.throw401(
                'Você não tem permissão para acessar este sistema.',
                { usua_login, usua_id: user.usua_id, idSistema, acessoStatus },
            );
        }

        const menus = await this.menus.findMenus(user.usua_id, idSistema);
        if (!menus.length) {
            this.throw401(
                'Usuário não possui menus cadastrados para este sistema.',
                { usua_login, usua_id: user.usua_id, idSistema },
            );
        }

        // Phase 1: qualquer usuário corporativo com menus = role admin local.
        // TODO Phase 2: derivar role/permissions a partir do conjunto de menus.
        const role: Role = 'admin';
        const permissions = resolvePermissions(role, []);

        const payload = {
            sub: String(user.usua_id),
            usua_id: user.usua_id,
            usua_login: user.usua_login,
            usua_nome: user.usua_nome,
            usua_email: user.usua_email,
            nome: user.usua_nome,
            email: user.usua_email,
            role,
            customPermissions: [] as string[],
        };

        const token = await this.jwt.signAsync(payload);

        return {
            token,
            user: this.toPublic(user),
            menus,
            permissions,
        };
    }

    async me(usuaId: string) {
        const idSistema = this.idSistema();
        const id = Number(usuaId);
        if (!Number.isInteger(id)) this.throw401('Sessão inválida', { usuaId });

        const user = await this.usuarios.findById(id);
        if (!user) this.throw401('Usuário não encontrado no dbacesso', { usuaId: id });

        const acesso = await this.usuariosSistema.findOneByUserAndSystem(id, idSistema);
        const acessoStatus = Number((acesso as any)?.ussi_status ?? -1);
        if (!acesso || acessoStatus !== 1) {
            this.throw401('Acesso ao sistema revogado', { usuaId: id, idSistema, acessoStatus });
        }

        const menus = await this.menus.findMenus(id, idSistema);
        const role: Role = 'admin';
        const permissions = resolvePermissions(role, []);

        return {
            user: this.toPublic(user),
            menus,
            permissions,
        };
    }

    /** Remove campos sensíveis (senha, biometria) antes de devolver ao cliente. */
    private toPublic(u: UsuarioRow) {
        return {
            id: String(u.usua_id),
            usua_id: u.usua_id,
            usua_login: u.usua_login,
            usua_nome: u.usua_nome,
            usua_email: u.usua_email,
            usua_cpf: u.usua_cpf,
            usua_foto: u.usua_foto,
            usua_sfcs_idusuario: u.usua_sfcs_idusuario,
            usua_status: u.usua_status,
            // Aliases para compatibilidade com o frontend atual.
            nome: u.usua_nome,
            email: u.usua_email,
            ativo: u.usua_status === '1',
            role: 'admin' as const,
        };
    }
}
