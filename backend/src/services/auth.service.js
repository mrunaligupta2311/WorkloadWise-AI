import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { signToken } from '../utils/jwt.js';
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(100), department: z.string().trim().max(80).optional() });
const safeUser = user => ({ id: user.id, name: user.name, email: user.email, role: user.role, department: user.department });
export async function login(input) {
  const data = loginSchema.parse(input); const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(data.password, user.passwordHash))) { const e = new Error('Email or password is incorrect.'); e.status = 401; throw e; }
  return { token: signToken(user), user: safeUser(user) };
}
export async function register(input) {
  const data = registerSchema.parse(input); const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({ data: { name: data.name, email: data.email.toLowerCase(), passwordHash, department: data.department || 'Engineering', role: 'EMPLOYEE' } });
  return { token: signToken(user), user: safeUser(user) };
}
