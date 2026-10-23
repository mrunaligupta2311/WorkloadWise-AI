
import { prisma } from '../utils/prisma.js';

export async function listRecommendations(user) {
  if (user.role === 'EMPLOYEE') return [];

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, department: true, role: true,
      weeklyCapacityHours: true
    }
  });

  const tasks = await prisma.task.findMany({
    where: { status: { not: 'DONE' } },
    include: { workLogs: { select: { hours: true } } },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }]
  });

  const loads = new Map(users.map(person => {
    const own = tasks.filter(task => task.assigneeId === person.id);
    const remaining = own.reduce((sum, task) => {
      const spent = task.workLogs.reduce((n, log) => n + log.hours, 0);
      return sum + Math.max(0, task.estimatedHours - spent);
    }, 0);
    const capacity = person.weeklyCapacityHours || 40;
    return [person.id, {
      ...person,
      remainingHours: remaining,
      capacity,
      utilization: capacity > 0 ? Math.round(remaining / capacity * 100) : 0
    }];
  }));

  const recommendations = [];

  for (const source of loads.values()) {
    if (source.utilization < 80) continue;

    const transferable = tasks
      .filter(task =>
        task.assigneeId === source.id &&
        task.status !== 'BLOCKED' &&
        !['URGENT'].includes(task.priority)
      )
      .map(task => {
        const spent = task.workLogs.reduce((sum, log) => sum + log.hours, 0);
        return { ...task, remainingHours: Math.max(0, task.estimatedHours - spent) };
      })
      .filter(task => task.remainingHours > 0);

    for (const task of transferable) {
      const targets = [...loads.values()]
        .filter(target =>
          target.id !== source.id &&
          target.utilization < 80 &&
          target.capacity - target.remainingHours >= task.remainingHours
        )
        .sort((a, b) => {
          const sameDeptA = a.department === source.department ? 0 : 1;
          const sameDeptB = b.department === source.department ? 0 : 1;
          return sameDeptA - sameDeptB || a.utilization - b.utilization;
        });

      const target = targets[0];
      if (!target) continue;

      recommendations.push({
        id: `${task.id}:${target.id}`,
        taskId: task.id,
        taskTitle: task.title,
        from: { id: source.id, name: source.name, utilization: source.utilization },
        to: { id: target.id, name: target.name, utilization: target.utilization },
        remainingHours: Math.round(task.remainingHours * 10) / 10,
        reason: `${source.name} is at ${source.utilization}% projected workload. ${target.name} is at ${target.utilization}% and has enough estimated capacity for this task.`,
        type: 'RULE_BASED_SUGGESTION'
      });
      break;
    }
  }

  return recommendations.slice(0, 10);
}
