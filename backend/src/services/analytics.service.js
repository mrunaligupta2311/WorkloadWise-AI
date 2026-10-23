import { prisma } from '../utils/prisma.js';

const round = n => Math.round(n * 10) / 10;

function taskHours(task) {
  const spent = (task.workLogs || []).reduce((sum, log) => sum + log.hours, 0);
  return { spent, remaining: Math.max(0, task.estimatedHours - spent) };
}

function analyse(users, tasks) {
  return users.map(user => {
    const own = tasks.filter(t => t.assigneeId === user.id);
    const active = own.filter(t => t.status !== 'DONE');
    const spent = own.reduce((sum, t) => sum + taskHours(t).spent, 0);
    const remaining = active.reduce((sum, t) => sum + taskHours(t).remaining, 0);
    const overdue = active.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;
    const urgent = active.filter(t => ['URGENT', 'HIGH'].includes(t.priority)).length;
    const score = Math.min(100, Math.round(remaining * 2.3 + overdue * 14 + urgent * 5));
    const level = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Balanced';

    let recommendation = level === 'High'
      ? 'Review deadlines and remaining effort; consider an approved reassignment or reducing scope.'
      : level === 'Medium'
        ? 'Check upcoming deadlines and rebalance work if needed.'
        : 'Remaining workload looks manageable; confirm priorities and upcoming work.';

    if (!active.length) recommendation = 'No active tasks. Confirm availability before assigning new work.';

    return {
      id: user.id,
      name: user.name,
      department: user.department,
      role: user.role,
      activeTasks: active.length,
      completedTasks: own.filter(t => t.status === 'DONE').length,
      workloadHours: round(remaining),
      remainingHours: round(remaining),
      loggedHours: round(spent),
      overdueTasks: overdue,
      highPriorityTasks: urgent,
      score,
      level,
      recommendation
    };
  });
}

export async function overview(user) {
  const taskWhere = user.role === 'EMPLOYEE' ? { assigneeId: user.id } : {};
  const userWhere = user.role === 'EMPLOYEE'
    ? { id: user.id, isActive: true }
    : { isActive: true };

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: {
        workLogs: { select: { hours: true } },
        assignee: { select: { id: true, name: true } }
      },
      orderBy: { dueDate: 'asc' }
    }),
    prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, role: true, department: true }
    })
  ]);

  const done = tasks.filter(t => t.status === 'DONE').length;
  const active = tasks.filter(t => t.status !== 'DONE');
  const overdueTasks = active.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
  const now = Date.now();
  const soonTasks = active.filter(t => {
    if (!t.dueDate) return false;
    const delta = new Date(t.dueDate).getTime() - now;
    return delta >= 0 && delta <= 48 * 60 * 60 * 1000;
  });

  const remainingHours = active.reduce((sum, t) => sum + taskHours(t).remaining, 0);
  const loggedHours = tasks.reduce((sum, t) => sum + taskHours(t).spent, 0);

  const alerts = [
    ...overdueTasks.map(t => ({
      taskId: t.id, title: t.title, assignee: t.assignee?.name || 'Unassigned',
      dueDate: t.dueDate, type: 'OVERDUE',
      message: 'Past due date — review the blocker and agree on a next step.'
    })),
    ...soonTasks.map(t => ({
      taskId: t.id, title: t.title, assignee: t.assignee?.name || 'Unassigned',
      dueDate: t.dueDate, type: 'DUE_SOON',
      message: 'Due within 48 hours — confirm progress and remaining effort.'
    }))
  ];

  return {
    metrics: {
      totalTasks: tasks.length,
      completedTasks: done,
      activeTasks: active.length,
      overdueTasks: overdueTasks.length,
      dueSoonTasks: soonTasks.length,
      completionRate: tasks.length ? Math.round(done / tasks.length * 100) : 0,
      estimatedActiveHours: round(remainingHours),
      remainingHours: round(remainingHours),
      loggedHours: round(loggedHours)
    },
    alerts,
    workload: analyse(users, tasks).sort((a, b) => b.score - a.score),
    statusBreakdown: [
      { name: 'To do', value: tasks.filter(t => t.status === 'TODO').length },
      { name: 'In progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length },
      { name: 'Blocked', value: tasks.filter(t => t.status === 'BLOCKED').length },
      { name: 'Done', value: done }
    ]
  };
}

export async function workload(user) {
  const [users, tasks] = await Promise.all([
    prisma.user.findMany({
      where: user.role === 'EMPLOYEE' ? { id: user.id, isActive: true } : { isActive: true },
      select: { id: true, name: true, role: true, department: true }
    }),
    prisma.task.findMany({
      where: user.role === 'EMPLOYEE' ? { assigneeId: user.id } : {},
      include: { workLogs: { select: { hours: true } } }
    })
  ]);
  return analyse(users, tasks).sort((a, b) => b.score - a.score);
}
