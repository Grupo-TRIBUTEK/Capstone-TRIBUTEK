import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from '../../prisma/contract.d.js';
import contractJson from '../../prisma/contract.json' with { type: 'json' };

process.loadEnvFile();

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured. Add it to backend/.env.');
}

export const db = postgres<Contract>({
  contractJson,
  url: databaseUrl,
});