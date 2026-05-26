import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    CreateBucketCommand,
    HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';

/**
 * Cliente S3 (MinIO) para anexos das conversas.
 *
 * Convenção de chaves:
 *   chat/{conversaId}/{sha256}.{ext}
 *
 * Como o nome inclui o sha256 do conteúdo, qualquer modificação no arquivo
 * gera outra key — o arquivo original permanece intacto (prova de integridade).
 */
@Injectable()
export class S3Service implements OnModuleInit {
    private readonly logger = new Logger(S3Service.name);
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicUrl: string;

    constructor() {
        const endpoint = process.env.S3_ENDPOINT ?? 'http://minio:9000';
        this.bucket = process.env.S3_BUCKET ?? 'demands-chat';
        this.publicUrl = process.env.S3_PUBLIC_URL ?? endpoint;

        this.client = new S3Client({
            endpoint,
            region: process.env.S3_REGION ?? 'us-east-1',
            forcePathStyle: true, // MinIO requer path-style
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY ?? 'demands',
                secretAccessKey: process.env.S3_SECRET_KEY ?? 'demands-minio-2024',
            },
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
            this.logger.log(`Bucket "${this.bucket}" pronto.`);
        } catch {
            try {
                await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
                this.logger.log(`Bucket "${this.bucket}" criado.`);
            } catch (err: any) {
                this.logger.warn(`Falha ao criar bucket: ${err?.message ?? err}`);
            }
        }
    }

    keyFor(conversaId: string, sha256: string, extension: string): string {
        const ext = extension.replace(/^\.+/, '').toLowerCase().slice(0, 10);
        return `chat/${conversaId}/${sha256}${ext ? '.' + ext : ''}`;
    }

    async upload(key: string, body: Buffer, mimeType: string): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentType: mimeType,
            }),
        );
    }

    async download(key: string): Promise<{ body: Buffer; contentType?: string }> {
        const out = await this.client.send(
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        const stream = out.Body as Readable;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return { body: Buffer.concat(chunks), contentType: out.ContentType };
    }

    /** URL temporária para download (expira em N segundos). */
    async presignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
        return getSignedUrl(
            this.client,
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
            { expiresIn: expiresInSeconds },
        );
    }
}
