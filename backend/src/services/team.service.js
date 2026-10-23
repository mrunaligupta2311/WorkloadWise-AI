import { prisma } from '../utils/prisma.js';

export async function list(user) {
  const users = await prisma.user.findMany({
    where: user.role === 'EMPLOYEE'
      ? { id: user.id }
      : { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      avatarUrl: true,
      weeklyCapacityHours: true,
      assignedTasks: {
        select: {
          id: true,
          status: true,
          estimatedHours: true,
          dueDate: true,
          priority: true,
          workLogs: { select: { hours: true } }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return users.map(({ assignedTasks, ...person }) => {
    const active = assignedTasks.filter(t => t.status !== 'DONE');
    const remaining = task => Math.max(
      0,
      task.estimatedHours -
      task.workLogs.reduce((sum, log) => sum + log.hours, 0)
    );

    const workloadHours = active.reduce((sum, task) => sum + remaining(task), 0);
    const loggedHours = assignedTasks.reduce(
      (sum, task) => sum + task.workLogs.reduce((n, log) => n + log.hours, 0),
      0
    );
    const capacity = person.weeklyCapacityHours || 40;
    const utilization = capacity > 0
      ? Math.round(workloadHours / capacity * 100)
      : 0;

    const workloadStatus = active.length === 0
      ? 'NO_ACTIVE_WORK'
      : utilization >= 100
        ? 'OVERLOADED'
        : utilization >= 80
          ? 'HIGH'
          : utilization < 40
            ? 'LOW'
            : 'BALANCED';

    return {
      ...person,
      taskCount: assignedTasks.length,
      activeTasks: active.length,
      workloadHours: Math.round(workloadHours * 10) / 10,
      loggedHours: Math.round(loggedHours * 10) / 10,
      workloadCapacityHours: capacity,
      workloadUtilization: utilization,
      workloadStatus
    };
  });
}
