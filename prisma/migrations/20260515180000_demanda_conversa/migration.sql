-- AlterTable
ALTER TABLE "Demanda" ADD COLUMN "criadorId" TEXT;
ALTER TABLE "Demanda" ADD COLUMN "criadorNome" TEXT;

-- CreateIndex
CREATE INDEX "Demanda_criadorId_idx" ON "Demanda"("criadorId");

-- CreateTable
CREATE TABLE "DemandaConversa" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorRole" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandaConversa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandaConversa_demandaId_criadoEm_idx" ON "DemandaConversa"("demandaId", "criadoEm");

-- AddForeignKey
ALTER TABLE "DemandaConversa" ADD CONSTRAINT "DemandaConversa_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
