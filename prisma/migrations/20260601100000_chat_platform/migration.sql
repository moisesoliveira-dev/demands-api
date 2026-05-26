-- ============================================================================
-- PLATAFORMA DE CONVERSAS estilo WhatsApp (com requisitos de prova legal)
-- ----------------------------------------------------------------------------
-- Cria 5 tabelas: Conversa, ConversaParticipante, Mensagem, MensagemAnexo,
-- MensagemLeitura. Mensagens e anexos são imutáveis — DELETE nunca é usado
-- pela aplicação (somente apagadoEm soft-delete). hashConteudo e sha256
-- garantem detecção de adulteração no banco / storage.
-- ============================================================================

-- CreateTable: Conversa
CREATE TABLE "Conversa" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT,
    "avatarUrl" TEXT,
    "demandaId" TEXT,
    "criadorId" TEXT NOT NULL,
    "criadorNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaMensagemEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversa_demandaId_key" ON "Conversa"("demandaId");
CREATE INDEX "Conversa_ultimaMensagemEm_idx" ON "Conversa"("ultimaMensagemEm");
CREATE INDEX "Conversa_tipo_idx" ON "Conversa"("tipo");
CREATE INDEX "Conversa_demandaId_idx" ON "Conversa"("demandaId");
CREATE INDEX "Conversa_criadorId_idx" ON "Conversa"("criadorId");

-- CreateTable: ConversaParticipante
CREATE TABLE "ConversaParticipante" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'membro',
    "entrouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiuEm" TIMESTAMP(3),
    "ultimaLeituraEm" TIMESTAMP(3),
    "silenciado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversaParticipante_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversaParticipante_conversaId_usuarioId_key"
    ON "ConversaParticipante"("conversaId", "usuarioId");
CREATE INDEX "ConversaParticipante_usuarioId_idx" ON "ConversaParticipante"("usuarioId");
CREATE INDEX "ConversaParticipante_conversaId_idx" ON "ConversaParticipante"("conversaId");

ALTER TABLE "ConversaParticipante"
    ADD CONSTRAINT "ConversaParticipante_conversaId_fkey"
    FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Mensagem
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'texto',
    "conteudo" TEXT NOT NULL DEFAULT '',
    "hashConteudo" TEXT NOT NULL,
    "ipOrigem" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3),
    "apagadoEm" TIMESTAMP(3),
    "analisada" BOOLEAN NOT NULL DEFAULT false,
    "analiseIA" TEXT,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Mensagem_conversaId_criadoEm_idx" ON "Mensagem"("conversaId", "criadoEm");
CREATE INDEX "Mensagem_autorId_idx" ON "Mensagem"("autorId");
CREATE INDEX "Mensagem_criadoEm_idx" ON "Mensagem"("criadoEm");

ALTER TABLE "Mensagem"
    ADD CONSTRAINT "Mensagem_conversaId_fkey"
    FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MensagemAnexo
CREATE TABLE "MensagemAnexo" (
    "id" TEXT NOT NULL,
    "mensagemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "largura" INTEGER,
    "altura" INTEGER,
    "duracaoMs" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemAnexo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MensagemAnexo_mensagemId_idx" ON "MensagemAnexo"("mensagemId");
CREATE INDEX "MensagemAnexo_sha256_idx" ON "MensagemAnexo"("sha256");

ALTER TABLE "MensagemAnexo"
    ADD CONSTRAINT "MensagemAnexo_mensagemId_fkey"
    FOREIGN KEY ("mensagemId") REFERENCES "Mensagem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MensagemLeitura
CREATE TABLE "MensagemLeitura" (
    "mensagemId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "lidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemLeitura_pkey" PRIMARY KEY ("mensagemId","usuarioId")
);

CREATE INDEX "MensagemLeitura_usuarioId_idx" ON "MensagemLeitura"("usuarioId");

ALTER TABLE "MensagemLeitura"
    ADD CONSTRAINT "MensagemLeitura_mensagemId_fkey"
    FOREIGN KEY ("mensagemId") REFERENCES "Mensagem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
