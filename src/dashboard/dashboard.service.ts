import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async resumo() {
        const [total, byStatusRows, byPrioridadeRows, bySetorRows, byResponsavelRows, criticas] = await Promise.all([
            this.prisma.demanda.count(),
            this.prisma.demanda.groupBy({ by: ['status'], _count: { _all: true } }),
            this.prisma.demanda.groupBy({ by: ['prioridade'], _count: { _all: true } }),
            this.prisma.demanda.groupBy({ by: ['setor'], _count: { _all: true } }),
            this.prisma.demanda.groupBy({ by: ['responsavel'], _count: { _all: true } }),
            this.prisma.demanda.count({ where: { prioridade: { gte: 4 } } }),
        ]);

        const byStatus = Object.fromEntries(byStatusRows.map((r) => [r.status, r._count._all]));
        const byPrioridade = Object.fromEntries(byPrioridadeRows.map((r) => [String(r.prioridade), r._count._all]));
        const bySetor = Object.fromEntries(bySetorRows.map((r) => [r.setor, r._count._all]));
        const byResponsavel = Object.fromEntries(byResponsavelRows.map((r) => [r.responsavel, r._count._all]));

        const concluidas = byStatus['concluido'] ?? 0;
        const andamento = byStatus['em_andamento'] ?? 0;
        const pendentes = byStatus['pendente'] ?? 0;
        const bloqueadas = byStatus['bloqueado'] ?? 0;
        const taxaConclusao = total ? Math.round((concluidas / total) * 100) : 0;

        return {
            total,
            pendentes,
            andamento,
            concluidas,
            bloqueadas,
            criticas,
            taxaConclusao,
            byStatus,
            byPrioridade,
            bySetor,
            byResponsavel,
        };
    }

    async serieTemporal(diasJanela = 14) {
        const today = new Date();
        const days: { data: string; criadas: number; concluidas: number }[] = [];
        for (let i = diasJanela - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push({ data: d.toISOString().slice(0, 10), criadas: 0, concluidas: 0 });
        }
        const map = new Map(days.map((d) => [d.data, d]));

        const since = new Date(today);
        since.setDate(since.getDate() - diasJanela);
        const rows = await this.prisma.demanda.findMany({
            where: { OR: [{ criadoEm: { gte: since } }, { atualizadoEm: { gte: since } }] },
            select: { criadoEm: true, atualizadoEm: true, status: true },
        });

        for (const dem of rows) {
            const cKey = dem.criadoEm.toISOString().slice(0, 10);
            const aKey = dem.atualizadoEm.toISOString().slice(0, 10);
            if (map.has(cKey)) map.get(cKey)!.criadas++;
            if (dem.status === 'concluido' && map.has(aKey)) map.get(aKey)!.concluidas++;
        }
        return days;
    }
}
