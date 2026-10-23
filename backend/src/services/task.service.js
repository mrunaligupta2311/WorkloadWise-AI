
import { prisma } from '../utils/prisma.js';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  estimatedHours: z.coerce.number().min(0.25).max(500).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().min(1).optional(),
  attachmentUrl: z.string().url().optional().nullable()
});

const workLogSchema = z.object({
  hours: z.coerce.number().positive().max(24),
  note: z.string().trim().max(1000).optional().nullable()
});

const include = {
  assignee: {
    select: { id: true, name: true, email: true, role: true, department: true }
  },
  creator: { select: { id: true, name: true } },
  reassignmentHistory: {
    orderBy: { createdAt: 'desc' },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true } }
    }
  },
  workLogs: {
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } }
  }
};

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function metrics(task) {
  const spent = (task.workLogs || []).reduce((sum, log) => sum + log.hours, 0);
  const remaining = Math.max(0, task.estimatedHours - spent);
  const now = new Date();
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = Boolean(due && due < now && task.status !== 'DONE');
  const dueSoon = Boolean(
    due && !overdue && task.status !== 'DONE' &&
    due.getTime() - now.getTime() <= 48 * 60 * 60 * 1000
  );

  return {
    ...task,
    hoursSpent: Math.round(spent * 100) / 100,
    remainingHours: Math.round(remaining * 100) / 100,
    completionPercent: task.estimatedHours > 0
      ? Math.min(100, Math.round(spent / task.estimatedHours * 100))
      : 0,
    overdue,
    dueSoon
  };
}

export async function list(user, query = {}) {
  const where = {};

  if (user.role === 'EMPLOYEE') {
    where.assigneeId = user.id;
  } else if (query.assigneeId) {
    where.assigneeId = query.assigneeId;
  }

  if (query.status && ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(query.status)) {
    where.status = query.status;
  }

  const tasks = await prisma.task.findMany({
    where,
    include,
    orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }]
  });

  return tasks.map(metrics);
}

export async function create(user, input) {
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw fail(403, 'Only managers and admins can create tasks.');
  }

  const data = taskSchema.parse(input);
  const assigneeId = data.assigneeId || user.id;
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, isActive: true }
  });

  if (!assignee || !assignee.isActive) {
    throw fail(400, 'Assignee not found or account is inactive.');
  }

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      estimatedHours: data.estimatedHours ?? 2,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      attachmentUrl: data.attachmentUrl || null,
      assigneeId,
      creatorId: user.id
    },
    include
  });

  return metrics(task);
}

export async function update(user, id, input) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw fail(404, 'Task not found.');

  const data = taskSchema.partial().parse(input);

  if (user.role === 'EMPLOYEE') {
    if (existing.assigneeId !== user.id) {
      throw fail(403, 'You can only update your own tasks.');
    }
    const forbidden = Object.keys(input || {}).filter(key => key !== 'status');
    if (forbidden.length) {
      throw fail(403, 'Employees can only update task status.');
    }
  } else if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw fail(403, 'You do not have permission to update tasks.');
  }

  if (data.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: data.assigneeId },
      select: { id: true, isActive: true }
    });
    if (!assignee || !assignee.isActive) {
      throw fail(400, 'Assignee not found or account is inactive.');
    }
  }

  const updateData = { ...data };
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.status === 'DONE' && existing.status !== 'DONE') {
    updateData.completedAt = new Date();
  } else if (data.status && data.status !== 'DONE') {
    updateData.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include
  });

  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    await prisma.workReassignment.create({
      data: {
        taskId: id,
        fromUserId: existing.assigneeId,
        toUserId: data.assigneeId,
        changedById: user.id,
        reason: typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) || null : null
      }
    });
    const withHistory = await prisma.task.findUnique({ where: { id }, include });
    return metrics(withHistory);
  }

  return metrics(task);
}

export async function logWork(user, id, input) {
  const data = workLogSchema.parse(input);
  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) throw fail(404, 'Task not found.');
  if (task.status === 'DONE') {
    throw fail(400, 'This task is completed. Reopen it before logging more work.');
  }

  if (user.role === 'EMPLOYEE' && task.assigneeId !== user.id) {
    throw fail(403, 'You can only log work on your own tasks.');
  }
  if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
    throw fail(403, 'You do not have permission to log work.');
  }

  await prisma.workLog.create({
    data: {
      taskId: id,
      userId: user.id,
      hours: data.hours,
      note: data.note || null
    }
  });

  const updated = await prisma.task.findUnique({
    where: { id },
    include
  });

  return metrics(updated);
}

export async function remove(user, id) {
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw fail(403, 'Only managers and admins can delete tasks.');
  }

  const result = await prisma.task.deleteMany({ where: { id } });
  if (!result.count) throw fail(404, 'Task not found.');

  return { success: true };
}
