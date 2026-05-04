/**
 * Script de bootstrap: cria o primeiro usuário admin.
 * Execute apenas uma vez, antes de iniciar o servidor pela primeira vez.
 *
 * Uso:
 *   npx ts-node -e "require('./scripts/create-admin.ts')"
 *   --ou--
 *   npm run create:admin
 *
 * Variáveis de ambiente (todas opcionais, têm defaults de desenvolvimento):
 *   ADMIN_NOME     — nome do admin  (default: Administrador)
 *   ADMIN_EMAIL    — e-mail do admin (default: admin@local.dev)
 *   ADMIN_SENHA    — senha do admin  (default: Admin@1234)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.user.count();
    if (count > 0) {
        console.log(`Banco já possui ${count} usuário(s). Nenhum admin criado.`);
        return;
    }

    const nome = process.env['ADMIN_NOME'] ?? 'Administrador';
    const email = (process.env['ADMIN_EMAIL'] ?? 'admin@local.dev').toLowerCase();
    const senha = process.env['ADMIN_SENHA'] ?? 'Admin@1234';

    const senhaHash = await bcrypt.hash(senha, 10);

    await prisma.user.create({
        data: {
            nome,
            email,
            senhaHash,
            cargo: 'Administrador',
            setor: 'TI',
            role: 'admin',
            ativo: true,
        },
    });

    console.log(`✓ Admin criado: ${email} / ${senha}`);
    console.log('  Troque a senha após o primeiro login!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
