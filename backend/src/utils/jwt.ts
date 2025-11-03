import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthUser } from '../types';

export const generateToken = (payload: AuthUser): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const verifyToken = (token: string): AuthUser => {
  try {
    return jwt.verify(token, config.jwt.secret) as AuthUser;
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
};
