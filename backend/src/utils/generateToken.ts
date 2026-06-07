import { Response } from 'express';
import jwt from 'jsonwebtoken';

export const generateToken = (res: Response, userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET || 'pchat_secret_fallback_key';
  
  const token = jwt.sign({ userId }, jwtSecret, {
    expiresIn: '30d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return token;
};
