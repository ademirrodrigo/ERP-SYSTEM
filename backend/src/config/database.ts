import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Middleware para soft delete (opcional)
prisma.$use(async (params, next) => {
  const result = await next(params);
  return result;
});

export default prisma;
