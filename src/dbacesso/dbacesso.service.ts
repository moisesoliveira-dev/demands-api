import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, RowDataPacket } from 'mysql2/promise';

/**
 * Conexão somente-leitura com o banco corporativo `dbacesso`.
 *
 * REGRAS DE OURO:
 * - NUNCA executar DDL (CREATE/ALTER/DROP) ou DML que modifique dados.
 * - Apenas SELECT.
 * - Sem migrations, sem seeds, sem auto-criação de tabelas.
 * - Schema é gerenciado por outro time/sistema.
 */
@Injectable()
export class DbacessoService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DbacessoService.name);
    private pool!: Pool;

    constructor(private readonly cfg: ConfigService) { }

    onModuleInit() {
        const host = this.cfg.get<string>('DATABASE_ACESSO_HOST');
        const port = Number(this.cfg.get<string>('DATABASE_ACESSO_PORT') ?? 3306);
        const user = this.cfg.get<string>('DATABASE_ACESSO_USER');
        const password = this.cfg.get<string>('DATABASE_ACESSO_PASSWORD');
        const database = this.cfg.get<string>('DATABASE_ACESSO_NAME');

        if (!host || !user || !database) {
            this.logger.warn(
                'dbacesso: variáveis DATABASE_ACESSO_* não configuradas — login corporativo desabilitado.',
            );
            return;
        }

        this.pool = createPool({
            host,
            port,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            enableKeepAlive: true,
            // segurança: nunca permitir múltiplos statements no mesmo query
            multipleStatements: false,
        });

        this.logger.log(`dbacesso: pool conectado em ${host}:${port}/${database}`);
    }

    async onModuleDestroy() {
        if (this.pool) await this.pool.end();
    }

    /**
     * Executa um SELECT parametrizado e retorna as linhas tipadas.
     * Lança erro se o pool não estiver inicializado (env não configurado).
     */
    async select<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
        if (!this.pool) {
            throw new Error('dbacesso não está configurado (verifique variáveis DATABASE_ACESSO_*)');
        }
        const trimmed = sql.trim().toLowerCase();
        if (!trimmed.startsWith('select')) {
            throw new Error('dbacesso aceita apenas comandos SELECT');
        }
        const [rows] = await this.pool.execute<T[]>(sql, params as never);
        return rows;
    }
}
