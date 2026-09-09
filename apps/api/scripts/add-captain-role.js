import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN
      ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RESTAURANT_CAPTAIN';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;`,
  );
  console.log('RESTAURANT_CAPTAIN enum ready');
} catch (error) {
  // Fallback for Postgres versions without IF NOT EXISTS
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE 'RESTAURANT_CAPTAIN'`);
    console.log('RESTAURANT_CAPTAIN enum added');
  } catch (inner) {
    if (String(inner.message || inner).includes('already exists')) {
      console.log('RESTAURANT_CAPTAIN already exists');
    } else {
      throw inner;
    }
  }
} finally {
  await prisma.$disconnect();
}
