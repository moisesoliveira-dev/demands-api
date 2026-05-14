import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { RequirePermissions } from '../common/auth.decorators.js';

const PRI_LABEL: Record<number, string> = { 1: 'Baixa', 2: 'Normal', 3: 'Média', 4: 'Alta', 5: 'Crítica' };

function csvEscape(v: unknown): string {
    if (v == null) return '';
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@ApiTags('relatorios')
@ApiBearerAuth('access-token')
@Controller('relatorios')
export class RelatoriosController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly dashboard: DashboardService,
    ) { }

    @Get('resumo')
    @RequirePermissions('relatorios.visualizar')
    async resumo() {
        const r = await this.dashboard.resumo();
        return {
            total: r.total,
            andamento: r.andamento,
            concluidas: r.concluidas,
            taxaConclusao: r.taxaConclusao,
            byStatus: r.byStatus,
            bySetor: r.bySetor,
        };
    }

    @Get('demandas.csv')
    @RequirePermissions('relatorios.exportar')
    @Header('Content-Type', 'text/csv; charset=utf-8')
    @Header('Content-Disposition', 'attachment; filename="demandas.csv"')
    async exportarCSV(@Res() res: Response) {
        const headers = [
            'id', 'titulo', 'descricao', 'setor', 'responsavel',
            'prioridade', 'status', 'criadoEm', 'atualizadoEm', 'motivoBloqueio',
        ];
        const lines = [headers.join(';')];
        const rows = await this.prisma.demanda.findMany({ orderBy: { ordem: 'asc' } });
        for (const d of rows) {
            lines.push([
                d.id, d.titulo, d.descricao, d.setor, d.responsavel,
                PRI_LABEL[d.prioridade] ?? d.prioridade,
                d.status,
                d.criadoEm.toISOString(),
                d.atualizadoEm.toISOString(),
                d.motivoBloqueio ?? '',
            ].map(csvEscape).join(';'));
        }
        res.send('\uFEFF' + lines.join('\n'));
    }
}
