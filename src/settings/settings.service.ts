import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

const COMPANY_KEYS = ['company_name', 'company_logo_url', 'company_context'] as const;
type CompanyKey = (typeof COMPANY_KEYS)[number];

export interface CompanySettings {
    company_name: string;
    company_logo_url: string;
    company_context: string;
}

export interface DbInfo {
    host: string;
    port: string;
    database: string;
    user: string;
    ssl: boolean;
}

export interface AppSettingsResponse {
    company: CompanySettings;
    db: DbInfo;
}

@Injectable()
export class SettingsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    async getAll(): Promise<AppSettingsResponse> {
        const rows = await this.prisma.appSetting.findMany({
            where: { key: { in: [...COMPANY_KEYS] } },
        });
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

        const company: CompanySettings = {
            company_name: map['company_name'] ?? '',
            company_logo_url: map['company_logo_url'] ?? '',
            company_context: map['company_context'] ?? '',
        };

        return { company, db: this.parseDbUrl() };
    }

    async updateCompany(patch: Partial<CompanySettings>, userId: string): Promise<CompanySettings> {
        for (const key of COMPANY_KEYS) {
            if (patch[key] === undefined) continue;
            await this.prisma.appSetting.upsert({
                where: { key },
                update: { value: patch[key] ?? '', updatedBy: userId },
                create: { key, value: patch[key] ?? '', updatedBy: userId },
            });
        }
        const rows = await this.prisma.appSetting.findMany({
            where: { key: { in: [...COMPANY_KEYS] } },
        });
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        return {
            company_name: map['company_name'] ?? '',
            company_logo_url: map['company_logo_url'] ?? '',
            company_context: map['company_context'] ?? '',
        };
    }

    private parseDbUrl(): DbInfo {
        const raw = this.config.get<string>('DATABASE_URL') ?? '';
        try {
            // postgresql://user:pass@host:port/database?schema=...
            const url = new URL(raw.replace(/^postgresql:\/\//, 'http://'));
            return {
                host: url.hostname,
                port: url.port || '5432',
                database: url.pathname.replace('/', ''),
                user: url.username,
                ssl: raw.includes('sslmode=require') || raw.includes('ssl=true'),
            };
        } catch {
            return { host: '—', port: '—', database: '—', user: '—', ssl: false };
        }
    }
}
