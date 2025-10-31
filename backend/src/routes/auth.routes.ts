import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Schemas de validação
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    companyName: z.string().min(3, 'Nome da empresa deve ter no mínimo 3 caracteres'),
    cnpj: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória'),
  }),
});

// Rotas públicas
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Rotas autenticadas
router.get('/me', authenticate, me);

export default router;
