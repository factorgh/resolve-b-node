import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { responseFactory } from '../utils/responseFactory';
import { getJwtSecret } from '../utils/jwtConfig';

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(responseFactory.unauthorized('No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(responseFactory.unauthorized('Invalid or expired token'));
  }
};
