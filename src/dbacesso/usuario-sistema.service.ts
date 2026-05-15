import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DbacessoService } from './dbacesso.service.js';
import type { UsuarioSistemaRow } from './types.js';

type UsuarioSistemaRowDb = UsuarioSistemaRow & RowDataPacket;

/**
 * Valida se um usuário corporativo tem acesso a um determinado sistema (ID_SISTEMA).
 * Tabela: dbacesso.usuario_sistema
 */
@Injectable()
export class UsuarioSistemaCorpService {
    constructor(private readonly db: DbacessoService) { }

    async findOneByUserAndSystem(usua_id: number, sist_id: number): Promise<UsuarioSistemaRow | null> {
        const rows = await this.db.select<UsuarioSistemaRowDb>(
            'SELECT * FROM usuario_sistema WHERE ussi_usua_id = ? AND ussi_sist_id = ? LIMIT 1',
            [usua_id, sist_id],
        );
        return rows[0] ?? null;
    }
}
