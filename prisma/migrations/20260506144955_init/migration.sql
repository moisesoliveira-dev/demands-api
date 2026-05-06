-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "customPermissions" TEXT NOT NULL DEFAULT '[]',
    "avatar" TEXT,
    "avatarUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcesso" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "responsavel" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demanda" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prioridade" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "motivoBloqueio" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoAuditoria" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "motivo" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "demandaId" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'sistema',
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 3,
    "acao" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Nova triagem',
    "step" TEXT NOT NULL DEFAULT 'descricao',
    "status" TEXT NOT NULL DEFAULT 'andamento',
    "draft" TEXT NOT NULL DEFAULT '{}',
    "messages" TEXT NOT NULL DEFAULT '[]',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Setor_nome_key" ON "Setor"("nome");

-- CreateIndex
CREATE INDEX "Demanda_status_idx" ON "Demanda"("status");

-- CreateIndex
CREATE INDEX "Demanda_setor_idx" ON "Demanda"("setor");

-- CreateIndex
CREATE INDEX "Demanda_responsavel_idx" ON "Demanda"("responsavel");

-- CreateIndex
CREATE INDEX "Demanda_ordem_idx" ON "Demanda"("ordem");

-- CreateIndex
CREATE INDEX "HistoricoAuditoria_demandaId_idx" ON "HistoricoAuditoria"("demandaId");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_idx" ON "Notificacao"("usuarioId");

-- CreateIndex
CREATE INDEX "Notificacao_timestamp_idx" ON "Notificacao"("timestamp");

-- CreateIndex
CREATE INDEX "ChatSession_usuarioId_idx" ON "ChatSession"("usuarioId");

-- CreateIndex
CREATE INDEX "ChatSession_atualizadaEm_idx" ON "ChatSession"("atualizadaEm");

-- AddForeignKey
ALTER TABLE "HistoricoAuditoria" ADD CONSTRAINT "HistoricoAuditoria_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
