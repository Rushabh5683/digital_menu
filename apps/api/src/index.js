import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error.message);
    process.exit(1);
  }

  app.listen(env.port, '0.0.0.0', () => {
  console.log(`API listening on port ${env.port}`);
});
}

start();


