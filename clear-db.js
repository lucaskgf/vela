/**
 * Script de manutenção LOCAL: limpa a collection de velas do banco.
 *
 * ⚠️ PROTEÇÃO DE SEGURANÇA:
 * Este script se recusa a rodar em produção. Se DATABASE_URL apontar para o banco
 * de produção (ou conter indicadores de banco real), ele aborta antes de apagar
 * qualquer coisa. Nunca mais um `node clear-db.js` acidental vai apagar homenagens
 * pagas de verdade.
 *
 * Uso: node clear-db.js   (apenas em dev/local)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function isLikelyProduction(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  // Heurísticas: o banco de dev costuma rodar em localhost / 127.0.0.1 / mongodb-container.
  // Se houver host de provedor na nuvem, consideramos produção e bloqueamos.
  const prodIndicators = ['mongodb.net', 'cosmos.azure', 'docdb.amazonaws', 'mongolab', 'mlab.com'];
  return prodIndicators.some((p) => u.includes(p));
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (process.env.NODE_ENV === 'production' || isLikelyProduction(dbUrl)) {
    console.error('🛑 BLOQUEADO: este script não roda contra um banco de produção.');
    console.error('   DATABASE_URL parece apontar para um provedor em nuvem.');
    console.error('   Se você tem CERTEZA de que quer limpar este banco (raro), exporte FORCE_CLEAR_PROD=1.');
    if (process.env.FORCE_CLEAR_PROD !== '1') {
      process.exit(2);
    }
    console.warn('⚠️  FORCE_CLEAR_PROD=1 detectado. Prosseguindo por sua conta e risco...');
  }

  const result = await prisma.candle.deleteMany({});
  console.log(`Banco limpo. ${result.count} velas removidas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
