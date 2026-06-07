import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;

  // Fallback to Bearer token header if cookie is missing
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'pchat_secret_fallback_key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    if (user.isBanned) {
      res.clearCookie('token');
      return res.status(403).json({ message: 'Your account has been banned by an administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT auth middleware validation error:', error);
    return res.status(401).json({ message: 'Not authorized, token validation failed' });
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an administrator' });
  }
};
