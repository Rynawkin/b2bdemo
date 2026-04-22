/**
 * İlk Admin Kullanıcı Oluşturma Script'i
 *
 * Kullanım: npx ts-node scripts/createAdmin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'readline';
import { getDefaultTenantSlug, getTenantConfigBySlug } from '../src/tenant/catalog';
import { ensureTenantRecord } from '../src/tenant/db';
import { tenantScopedOrNull } from '../src/tenant/scope';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

async function createAdmin() {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   👤 Admin Kullanıcı Oluşturma            ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  try {
    const tenantSlug = process.env.DEFAULT_TENANT_SLUG || getDefaultTenantSlug();
    const tenantConfig = getTenantConfigBySlug(tenantSlug);
    const tenantRecord = await ensureTenantRecord(tenantConfig);

    const email = await question('Email: ');
    const password = await question('Şifre: ');
    const name = await question('Ad Soyad: ');

    if (!email || !password || !name) {
      console.log('❌ Tüm alanları doldurun!');
      process.exit(1);
    }

    // Email kontrolü
    const existing = await prisma.user.findFirst({
      where: {
        email,
        ...tenantScopedOrNull(tenantRecord.id),
      },
    });

    if (existing) {
      console.log('❌ Bu email zaten kullanılıyor!');
      process.exit(1);
    }

    // Şifre hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // Admin oluştur
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        tenantId: tenantRecord.id,
        role: 'ADMIN',
        active: true,
      },
    });

    console.log('');
    console.log('✅ Admin kullanıcı başarıyla oluşturuldu!');
    console.log('');
    console.log('📧 Email:', admin.email);
    console.log('👤 Ad:', admin.name);
    console.log('🆔 ID:', admin.id);
    console.log('');

    // Default settings oluştur
    const existingSettings = await prisma.settings.findFirst({
      where: tenantScopedOrNull(tenantRecord.id),
    });

    if (!existingSettings) {
      await prisma.settings.create({
        data: {
          tenantId: tenantRecord.id,
          calculationPeriodMonths: 3,
          includedWarehouses: ['DEPO1', 'MERKEZ'],
          minimumExcessThreshold: 10,
          costCalculationMethod: 'LAST_ENTRY',
          whiteVatFormula: 'cost * (1 + vat/2)',
        },
      });

      console.log('⚙️  Default ayarlar oluşturuldu');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
