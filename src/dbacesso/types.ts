/**
 * Tipos refletindo as tabelas do banco corporativo `dbacesso`.
 * IMPORTANTE: este banco é de leitura apenas — nenhuma modificação é permitida.
 * Estrutura conforme projeto referência `dgb_mes_wce`.
 */

export interface UsuarioRow {
    usua_id: number;
    usua_cpf: string;
    usua_nome: string;
    usua_email: string;
    usua_login: string;
    usua_senha: string;
    usua_assinatura: string | null;
    usua_biometria: string | null;
    usua_rfid: string | null;
    usua_foto: string | null;
    usua_sisconp_id: number | null;
    usua_sfcs_idusuario: number | null;
    usua_tentativas_acesso: number | null;
    usua_status: string;
}

export interface UsuarioSistemaRow {
    ussi_usua_id: number;
    ussi_sist_id: number;
    ussi_status: number;
    ussi_responsavel: number | null;
    ussi_data_associacao: Date;
    ussi_tema: string | null;
}

/** Linha bruta da tabela `menu` em dbacesso. */
export interface MenuRow {
    menu_id: number;
    menu_nome: string;
    menu_descricao: string | null;
    menu_status: '1' | '0';
    menu_url: string | null;
    menu_ordem: number;
    menu_logo: string | null;
    menu_sist_id: number;
    menu_menu_id_pred: number | null;
}

/**
 * Menu enriquecido com permissões CRUD do usuário
 * (resultado do join `menu_usuario` + `menu`).
 */
export interface MenuComPermissaoRow extends MenuRow {
    perf_id: number;
    can_insert: boolean;
    can_update: boolean;
    can_delete: boolean;
}

/**
 * Árvore hierárquica devolvida ao frontend. Formato compatível
 * com `MenuItem` do PrimeNG (label/icon/routerLink/items).
 */
export interface MenuTreeNode {
    id: number;
    label: string;
    icon: string | null;
    routerLink: string | null;
    order: number;
    perfilId: number | null;
    permissions: { insert: boolean; update: boolean; delete: boolean };
    items: MenuTreeNode[];
}
