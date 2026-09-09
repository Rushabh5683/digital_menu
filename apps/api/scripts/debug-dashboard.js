import { PrismaClient } from '@prisma/client';
import { getSuperDashboard } from '../src/modules/super/super.service.js';

const prisma = new PrismaClient();

try {
  const count = await prisma.restaurant.count({ where: { status: 'ACTIVE' } });
  console.log('count ok', count);
  const dash = await getSuperDashboard();
  console.log('dashboard ok', JSON.stringify(dash.totals, null, 2));
} catch (error) {
  console.error('ERR NAME', error.name);
  console.error('ERR MSG', error.message);
} finally {
  await prisma.$disconnect();
}
