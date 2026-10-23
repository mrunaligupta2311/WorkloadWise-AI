import { z } from 'zod';
import { prisma } from '../utils/prisma.js';

const preferencesSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  workloadInsightsEnabled: z.boolean().optional()
}).strict();

export async function getSettings(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        notificationsEnabled: true,
        workloadInsightsEnabled: true
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({ preferences: user });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const data = preferencesSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Choose a preference to update.' });
    }

    const preferences = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        notificationsEnabled: true,
        workloadInsightsEnabled: true
      }
    });

    return res.json({ preferences, message: 'Preferences saved.' });
  } catch (error) {
    next(error);
  }
}
