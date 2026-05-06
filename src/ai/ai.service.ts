import { HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
    private readonly baseUrl: string;

    constructor(private readonly cfg: ConfigService) {
        this.baseUrl = (cfg.get<string>('DEMANDS_AI_URL') ?? 'http://localhost:7777').replace(/\/$/, '');
    }

    async proxy(
        path: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
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

            // 204 / 205 não têm body
            if (res.status === 204 || res.status === 205) return null;
            return res.json();
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Serviço de IA indisponível');
        }
    }

    /**
     * Faz forward de um upload (multipart/form-data) recebido pelo NestJS para o
     * endpoint correspondente no Agno. Reconstrói o FormData usando o buffer do Multer.
     */
    async proxyUpload(
        path: string,
        authorizationHeader: string,
        file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
        fieldName = 'file',
        extraFields?: Record<string, string | undefined | null>,
    ): Promise<unknown> {
        if (!file) {
            throw new InternalServerErrorException('Arquivo não enviado');
        }
        const url = `${this.baseUrl}${path}`;
        const form = new FormData();
        form.append(
            fieldName,
            new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'application/octet-stream' }),
            file.originalname,
        );
        if (extraFields) {
            for (const [k, v] of Object.entries(extraFields)) {
                if (v !== undefined && v !== null && String(v).length > 0) {
                    form.append(k, String(v));
                }
            }
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { Authorization: authorizationHeader }, // Content-Type é setado pelo runtime com boundary
                body: form,
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new InternalServerErrorException(`Serviço de IA retornou ${res.status}: ${text}`);
            }

            if (res.status === 204 || res.status === 205) return null;
            return res.json();
        } catch (err) {
            if (err instanceof InternalServerErrorException) throw err;
            throw new InternalServerErrorException('Serviço de IA indisponível');
        }
    }
}
