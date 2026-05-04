import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
    private readonly baseUrl: string;

    constructor(private readonly cfg: ConfigService) {
        this.baseUrl = (cfg.get<string>('DEMANDS_AI_URL') ?? 'http://localhost:7777').replace(/\/$/, '');
    }

    async proxy(
        path: string,
        method: 'GET' | 'POST',
        authorizationHeader: string,
        body?: unknown,
    ): Promise<unknown> {
        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: authorizationHeader,
        };

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new InternalServerErrorException(`Serviço de IA retornou ${res.status}: ${text}`);
            }

            return res.json();
        } catch (err) {
            if (err instanceof InternalServerErrorException) throw err;
            throw new InternalServerErrorException('Serviço de IA indisponível');
        }
    }
}
