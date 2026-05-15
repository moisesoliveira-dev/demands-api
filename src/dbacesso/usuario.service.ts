import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DbacessoService } from './dbacesso.service.js';
import type { UsuarioRow } from './types.js';

type UsuarioRowDb = UsuarioRow & RowDataPacket;

/**
 * Acesso somente-leitura à tabela `usuario` do banco corporativo `dbacesso`.
 */
@Injectable()
export class UsuarioCorpService {
    constructor(private readonly db: DbacessoService) { }

    async findByLogin(usua_login: string): Promise<UsuarioRow | null> {
        const rows = await this.db.select<UsuarioRowDb>(
            'SELECT * FROM usuario WHERE usua_login = ? LIMIT 1',
            [usua_login],
        );
        return rows[0] ?? null;
    }

    async findById(usua_id: number): Promise<UsuarioRow | null> {
        const rows = await this.db.select<UsuarioRowDb>(
            'SELECT * FROM usuario WHERE usua_id = ? LIMIT 1',
            [usua_id],
        );
        return rows[0] ?? null;
    }
}
