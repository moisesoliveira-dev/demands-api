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
    ussi_responsavel: string | null;
    ussi_data_associacao: Date;
    ussi_tema: string | null;
}

export interface MenuRow {
    menu_id: number;
    menu_sist_id: number;
    menu_nome?: string;
    menu_status?: number;
    [key: string]: unknown;
}
