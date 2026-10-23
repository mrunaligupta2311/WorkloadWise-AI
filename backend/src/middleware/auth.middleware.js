import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true, department: true, isActive: true } });
    if (!user || !user.isActive) return res.status(401).json({ message: 'Account is unavailable.' });
    req.user = user; next();
  } catch { return res.status(401).json({ message: 'Invalid or expired token.' }); }
}
export function allowRoles(...roles) { return (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'You do not have permission to do that.' }); }
