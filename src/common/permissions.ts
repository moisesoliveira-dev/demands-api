export type Permission =
    | 'demandas.criar'
    | 'demandas.visualizar'
    | 'demandas.editar'
    | 'demandas.editar.proprias'
    | 'demandas.excluir'
    | 'demandas.atribuir'
    | 'demandas.mudar_status'
    | 'demandas.mudar_status.proprias'
    | 'demandas.mudar_prioridade'
    | 'demandas.arquivar'
    | 'demandas.comentar'
    | 'demandas.anexar_arquivos'
    | 'demandas.visualizar_todas'
    | 'dashboard.visualizar'
    | 'dashboard.metricas_gerenciais'
    | 'kanban.visualizar'
    | 'kanban.reorganizar'
    | 'configuracoes.acessar'
    | 'configuracoes.usuarios'
    | 'configuracoes.setores'
    | 'configuracoes.permissoes'
    | 'relatorios.visualizar'
    | 'relatorios.exportar'
    | 'auditoria.visualizar'
    | 'notificacoes.gerenciar';

export type Role = 'admin' | 'supervisor' | 'operador' | 'visualizador';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    admin: [
        'demandas.criar', 'demandas.visualizar', 'demandas.editar', 'demandas.excluir',
        'demandas.atribuir', 'demandas.mudar_status', 'demandas.mudar_prioridade',
        'demandas.arquivar', 'demandas.comentar', 'demandas.anexar_arquivos',
        'demandas.visualizar_todas', 'dashboard.visualizar', 'dashboard.metricas_gerenciais',
        'kanban.visualizar', 'kanban.reorganizar', 'configuracoes.acessar',
        'configuracoes.usuarios', 'configuracoes.setores', 'configuracoes.permissoes',
        'relatorios.visualizar', 'relatorios.exportar', 'auditoria.visualizar',
        'notificacoes.gerenciar',
    ],
    supervisor: [
        'demandas.criar', 'demandas.visualizar', 'demandas.editar', 'demandas.atribuir',
        'demandas.mudar_status', 'demandas.mudar_prioridade', 'demandas.arquivar',
        'demandas.comentar', 'demandas.anexar_arquivos', 'demandas.visualizar_todas',
        'dashboard.visualizar', 'dashboard.metricas_gerenciais', 'kanban.visualizar',
        'kanban.reorganizar', 'relatorios.visualizar', 'relatorios.exportar',
    ],
    operador: [
        'demandas.criar', 'demandas.visualizar', 'demandas.editar.proprias', 'demandas.mudar_status.proprias',
        'demandas.comentar', 'demandas.anexar_arquivos', 'dashboard.visualizar',
        'kanban.visualizar',
    ],
    visualizador: [
        'demandas.visualizar', 'dashboard.visualizar', 'kanban.visualizar',
        'relatorios.visualizar',
    ],
};

export function resolvePermissions(role: Role, custom: Permission[] = []): Permission[] {
    return Array.from(new Set([...(ROLE_PERMISSIONS[role] ?? []), ...custom]));
}
