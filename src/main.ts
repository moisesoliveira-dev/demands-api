import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    // Upload de vídeos até 100 MB (limites detalhados validados no service).
    bodyParser: true,
    rawBody: false,
  });
  // Multer (em FilesInterceptor) já lida com multipart; aumentamos json/urlencoded
  // para segurança.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Demands API')
    .setDescription(
      'API principal do sistema de demandas. Inclui autenticação, demandas, triagem conversacional e proxy para o serviço de IA.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('auth', 'Autenticação e perfil do usuário')
    .addTag('demandas', 'Gestão de demandas')
    .addTag('triagem', 'Triagem conversacional (NestJS local)')
    .addTag('setores', 'Setores e responsáveis')
    .addTag('users', 'Usuários e permissões')
    .addTag('notificacoes', 'Notificações do usuário')
    .addTag('dashboard', 'Métricas e KPIs')
    .addTag('relatorios', 'Relatórios e exportações')
    .addTag('ai', 'Proxy para o serviço de IA (demands-ai)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Swagger UI disponível em /api/docs (respeita o globalPrefix via customPath)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API rodando em http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger UI em http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
