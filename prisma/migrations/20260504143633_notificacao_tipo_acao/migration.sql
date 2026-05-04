-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notificacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT,
    "demandaId" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'sistema',
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 3,
    "acao" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notificacao_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Notificacao" ("demandaId", "id", "lida", "mensagem", "prioridade", "timestamp", "titulo", "usuarioId") SELECT "demandaId", "id", "lida", "mensagem", "prioridade", "timestamp", "titulo", "usuarioId" FROM "Notificacao";
DROP TABLE "Notificacao";
ALTER TABLE "new_Notificacao" RENAME TO "Notificacao";
CREATE INDEX "Notificacao_usuarioId_idx" ON "Notificacao"("usuarioId");
CREATE INDEX "Notificacao_timestamp_idx" ON "Notificacao"("timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
