import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma.service.js';

/** Idempotent seed: only runs if user/setor/demanda tables are empty. */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SeedService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onApplicationBootstrap(): Promise<void> {
        const userCount = await this.prisma.user.count();
        if (userCount === 0) {
            await this.seedUsers();
        }
        const setorCount = await this.prisma.setor.count();
        if (setorCount === 0) {
            await this.seedSetores();
        }
        const demandaCount = await this.prisma.demanda.count();
        if (demandaCount === 0) {
            await this.seedDemandas();
        }
    }

    private async seedUsers(): Promise<void> {
        const hash = (s: string) => bcrypt.hashSync(s, 8);
        const now = new Date();
        await this.prisma.user.createMany({
            data: [
                { id: '1', nome: 'Administrador', email: 'admin@fabrica.com', senhaHash: hash('123456'), cargo: 'Gerente', setor: 'TI', role: 'admin', ativo: true, criadoEm: now, ultimoAcesso: now },
                { id: '2', nome: 'Carlos Silva', email: 'supervisor@fabrica.com', senhaHash: hash('123456'), cargo: 'Supervisor', setor: 'Produção', role: 'supervisor', ativo: true, criadoEm: now, ultimoAcesso: now },
                { id: '3', nome: 'João Operador', email: 'operador@fabrica.com', senhaHash: hash('123456'), cargo: 'Operador', setor: 'Usinagem', role: 'operador', ativo: true, criadoEm: now, ultimoAcesso: now },
                { id: '4', nome: 'Maria Visualizadora', email: 'visualizador@fabrica.com', senhaHash: hash('123456'), cargo: 'Analista', setor: 'Qualidade', role: 'visualizador', ativo: true, criadoEm: now },
            ],
        });
        this.logger.log('Seeded 4 users');
    }

    private async seedSetores(): Promise<void> {
        await this.prisma.setor.createMany({
            data: [
                { id: 's1', nome: 'Produção', descricao: 'Linha de produção principal', responsavel: 'Carlos Silva', ativo: true, criadoEm: new Date('2024-01-10T08:00:00.000Z') },
                { id: 's2', nome: 'Usinagem', descricao: 'Setor de usinagem CNC', responsavel: 'João Operador', ativo: true, criadoEm: new Date('2024-01-10T08:00:00.000Z') },
                { id: 's3', nome: 'Montagem', descricao: 'Montagem de conjuntos', responsavel: 'Pedro Alves', ativo: true, criadoEm: new Date('2024-01-15T08:00:00.000Z') },
                { id: 's4', nome: 'Qualidade', descricao: 'Controle de qualidade', responsavel: 'Ana Costa', ativo: true, criadoEm: new Date('2024-01-15T08:00:00.000Z') },
                { id: 's5', nome: 'Manutenção', descricao: 'Manutenção industrial', responsavel: 'Rafael Mendes', ativo: true, criadoEm: new Date('2024-01-20T08:00:00.000Z') },
                { id: 's6', nome: 'TI', descricao: 'Tecnologia da informação', responsavel: 'Administrador', ativo: true, criadoEm: new Date('2024-01-20T08:00:00.000Z') },
                { id: 's7', nome: 'Pintura', descricao: 'Pintura e acabamento', responsavel: 'Lucas Pereira', ativo: false, criadoEm: new Date('2024-02-01T08:00:00.000Z') },
                { id: 's8', nome: 'Expedição', descricao: 'Expedição e logística', responsavel: 'Camila Rocha', ativo: true, criadoEm: new Date('2024-02-01T08:00:00.000Z') },
            ],
        });
        this.logger.log('Seeded 8 setores');
    }

    private async seedDemandas(): Promise<void> {
        await this.prisma.demanda.createMany({
            data: [
                { id: 'dem_001', titulo: 'Manutenção preventiva linha 3', descricao: 'Realizar manutenção preventiva na linha de produção 3 incluindo lubrificação de equipamentos e verificação de sensores', prioridade: 4, status: 'em_andamento', setor: 'Manutenção', responsavel: 'Carlos Souza', criadoEm: new Date('2025-01-15T08:30:00.000Z'), atualizadoEm: new Date('2025-01-15T14:20:00.000Z'), ordem: 0 },
                { id: 'dem_002', titulo: 'Inspeção de qualidade lote 4523', descricao: 'Verificar conformidade do lote 4523 conforme especificações técnicas e normas ISO 9001', prioridade: 5, status: 'pendente', setor: 'Qualidade', responsavel: 'Ana Costa', criadoEm: new Date('2025-01-15T09:15:00.000Z'), atualizadoEm: new Date('2025-01-15T09:15:00.000Z'), ordem: 1 },
                { id: 'dem_003', titulo: 'Ajuste de máquina de solda', descricao: 'Calibrar máquina de solda automática - apresentando inconsistências nos pontos de solda', prioridade: 3, status: 'bloqueado', setor: 'Soldagem', responsavel: 'Pedro Oliveira', criadoEm: new Date('2025-01-14T16:45:00.000Z'), atualizadoEm: new Date('2025-01-15T10:30:00.000Z'), ordem: 2, motivoBloqueio: 'Aguardando peça de reposição do fornecedor. Previsão de entrega: 3-5 dias úteis.' },
                { id: 'dem_004', titulo: 'Pintura cabines setor A', descricao: 'Aplicar nova camada de pintura nas peças do lote 4401 conforme especificação de cor RAL 5012', prioridade: 2, status: 'em_andamento', setor: 'Pintura', responsavel: 'João Silva', criadoEm: new Date('2025-01-14T11:00:00.000Z'), atualizadoEm: new Date('2025-01-15T08:00:00.000Z'), ordem: 3 },
                { id: 'dem_005', titulo: 'Separação pedido cliente Acme Corp', descricao: 'Separar e embalar pedido 8845 para expedição até 17/01 - inclui 240 unidades modelo X45', prioridade: 4, status: 'pendente', setor: 'Expedição', responsavel: 'Maria Santos', criadoEm: new Date('2025-01-15T07:20:00.000Z'), atualizadoEm: new Date('2025-01-15T07:20:00.000Z'), ordem: 4 },
                { id: 'dem_006', titulo: 'Montagem conjunto hidráulico', descricao: 'Montar 50 conjuntos hidráulicos modelo HX-200 conforme desenho técnico DT-8842', prioridade: 3, status: 'concluido', setor: 'Montagem', responsavel: 'Pedro Oliveira', criadoEm: new Date('2025-01-13T13:30:00.000Z'), atualizadoEm: new Date('2025-01-14T17:45:00.000Z'), ordem: 5 },
                { id: 'dem_007', titulo: 'Reposição de ferramentas desgastadas', descricao: 'Substituir ferramentas de corte e brocas desgastadas nas máquinas CNC 1, 3 e 5', prioridade: 2, status: 'concluido', setor: 'Manutenção', responsavel: 'Carlos Souza', criadoEm: new Date('2025-01-12T09:00:00.000Z'), atualizadoEm: new Date('2025-01-13T11:30:00.000Z'), ordem: 6 },
                { id: 'dem_008', titulo: 'Treinamento nova prensa hidráulica', descricao: 'Realizar treinamento da equipe de montagem para operação da nova prensa hidráulica de 200 toneladas', prioridade: 1, status: 'pendente', setor: 'Montagem', responsavel: 'João Silva', criadoEm: new Date('2025-01-15T10:00:00.000Z'), atualizadoEm: new Date('2025-01-15T10:00:00.000Z'), ordem: 7 },
            ],
        });
        this.logger.log('Seeded 8 demandas');
    }
}
