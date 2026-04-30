import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { SetoresModule } from './setores/setores.module.js';
import { DemandasModule } from './demandas/demandas.module.js';
import { NotificacoesModule } from './notificacoes/notificacoes.module.js';
import { TriagemModule } from './triagem/triagem.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { RelatoriosModule } from './relatorios/relatorios.module.js';

import { JwtAuthGuard } from './common/jwt-auth.guard.js';
import { PermissionsGuard } from './common/permissions.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SetoresModule,
    DemandasModule,
    NotificacoesModule,
    TriagemModule,
    DashboardModule,
    RelatoriosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule { }
