import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DbacessoService } from './dbacesso.service.js';
import type { MenuComPermissaoRow, MenuTreeNode } from './types.js';

type MenuJoinDb = MenuComPermissaoRow & RowDataPacket;

/**
 * Carrega menus que o usuário corporativo possui acesso, dentro do sistema atual,
 * já com as permissões CRUD vindas de `menu_usuario`.
 *
 * Tabelas: dbacesso.menu_usuario, dbacesso.menu
 */
@Injectable()
export class MenuUsuarioCorpService {
    constructor(private readonly db: DbacessoService) { }

    /**
     * Lista linear dos menus a que o usuário tem acesso no sistema, com flags CRUD.
     * Se o mesmo menu aparecer em mais de um perfil, mantém a versão mais permissiva.
     */
    async findMenus(usua_id: number, sist_id: number): Promise<MenuComPermissaoRow[]> {
        const rows = await this.db.select<MenuJoinDb>(
            `
            SELECT
                m.menu_id,
                m.menu_nome,
                m.menu_descricao,
                m.menu_status,
                m.menu_url,
                m.menu_ordem,
                m.menu_logo,
                m.menu_sist_id,
                m.menu_menu_id_pred,
                MAX(mu.meus_perf_id)      AS perf_id,
                MAX(mu.meus_insert = '1') AS can_insert,
                MAX(mu.meus_update = '1') AS can_update,
                MAX(mu.meus_delete = '1') AS can_delete
            FROM menu_usuario mu
            JOIN menu m ON m.menu_id = mu.meus_menu_id
            WHERE mu.meus_usua_id = ?
              AND m.menu_sist_id = ?
              AND m.menu_status = '1'
            GROUP BY m.menu_id
            ORDER BY m.menu_ordem, m.menu_nome
            `,
            [usua_id, sist_id],
        );

        return rows.map((r) => ({
            ...r,
            can_insert: Boolean(Number(r.can_insert)),
            can_update: Boolean(Number(r.can_update)),
            can_delete: Boolean(Number(r.can_delete)),
        }));
    }

    /**
     * Monta a árvore hierárquica (pai → filhos) usando `menu_menu_id_pred`.
     * Inclui menus pais ainda que o usuário não tenha grant explícito neles,
     * desde que existam no mesmo sistema — replica o comportamento do CASCI:
     * o usuário enxerga o "guarda-chuva" do menu se tem acesso a algum filho.
     */
    async findMenuTree(usua_id: number, sist_id: number): Promise<MenuTreeNode[]> {
        const acessiveis = await this.findMenus(usua_id, sist_id);
        if (!acessiveis.length) return [];

        const idsAcessiveis = new Set(acessiveis.map((m) => m.menu_id));
        const pendentes = new Set<number>();
        for (const m of acessiveis) {
            if (
                m.menu_menu_id_pred &&
                m.menu_menu_id_pred !== m.menu_id &&
                !idsAcessiveis.has(m.menu_menu_id_pred)
            ) {
                pendentes.add(m.menu_menu_id_pred);
            }
        }

        const ancestrais: MenuComPermissaoRow[] = [];
        if (pendentes.size) {
            const ids = Array.from(pendentes);
            const placeholders = ids.map(() => '?').join(',');
            const extra = await this.db.select<MenuJoinDb>(
                `
                SELECT
                    menu_id, menu_nome, menu_descricao, menu_status,
                    menu_url, menu_ordem, menu_logo, menu_sist_id, menu_menu_id_pred,
                    NULL AS perf_id, 0 AS can_insert, 0 AS can_update, 0 AS can_delete
                FROM menu
                WHERE menu_id IN (${placeholders})
                  AND menu_sist_id = ?
                  AND menu_status = '1'
                `,
                [...ids, sist_id],
            );
            for (const e of extra) {
                ancestrais.push({
                    ...e,
                    perf_id: 0,
                    can_insert: false,
                    can_update: false,
                    can_delete: false,
                });
            }
        }

        const todos = [...acessiveis, ...ancestrais];

        const byId = new Map<number, MenuTreeNode>();
        for (const m of todos) {
            byId.set(m.menu_id, {
                id: m.menu_id,
                label: m.menu_nome,
                icon: m.menu_logo,
                routerLink: m.menu_url,
                order: m.menu_ordem ?? 0,
                perfilId: m.perf_id || null,
                permissions: {
                    insert: m.can_insert,
                    update: m.can_update,
                    delete: m.can_delete,
                },
                items: [],
            });
        }

        const raizes: MenuTreeNode[] = [];
        for (const m of todos) {
            const node = byId.get(m.menu_id)!;
            const parentId = m.menu_menu_id_pred;
            const parent =
                parentId && parentId !== m.menu_id ? byId.get(parentId) : undefined;
            if (parent) {
                parent.items.push(node);
            } else {
                raizes.push(node);
            }
        }

        const sortRec = (nodes: MenuTreeNode[]) => {
            nodes.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
            nodes.forEach((n) => sortRec(n.items));
        };
        sortRec(raizes);

        return raizes;
    }
}
