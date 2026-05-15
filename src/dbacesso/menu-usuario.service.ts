import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DbacessoService } from './dbacesso.service.js';
import type { MenuRow } from './types.js';

type MenuRowDb = MenuRow & RowDataPacket;

/**
 * Carrega menus que o usuário corporativo possui acesso, dentro do sistema atual.
 * Tabelas: dbacesso.menu_usuario, dbacesso.menu
 */
@Injectable()
export class MenuUsuarioCorpService {
    constructor(private readonly db: DbacessoService) { }

    async findMenus(usua_id: number, sist_id: number): Promise<MenuRow[]> {
        return this.db.select<MenuRowDb>(
            `
            SELECT DISTINCT m.*
            FROM menu_usuario mu
            JOIN menu m ON m.menu_id = mu.meus_menu_id
            WHERE mu.meus_usua_id = ?
              AND m.menu_sist_id = ?
              AND m.menu_status = 1
            `,
            [usua_id, sist_id],
        );
    }
}
