import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, companyName, cnpj } = req.body;

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar empresa e usuário em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar empresa
      const company = await tx.company.create({
        data: {
          name: companyName,
          cnpj,
          email,
          isActive: true,
          plan: 'BASIC',
        },
      });

      // Criar usuário admin
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          companyId: company.id,
          isActive: true,
        },
      });

      return { company, user };
    });

    // Gerar token
    const token = generateToken({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      companyId: result.user.companyId,
    });

    res.status(201).json({
      message: 'Usuário e empresa criados com sucesso',
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.user.companyId,
      },
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar se está ativo
    if (!user.isActive || !user.company.isActive) {
      return res.status(403).json({ error: 'Usuário ou empresa desativados' });
    }

    // Verificar senha
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    });

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: {
          id: user.company.id,
          name: user.company.name,
          plan: user.company.plan,
        },
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        company: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            email: true,
            phone: true,
            plan: true,
            logo: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
};
