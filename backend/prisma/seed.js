import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);
  const people = [
    { name: 'Aarav Mehta', email: 'admin@workloadwise.demo', role: 'ADMIN', department: 'Operations' },
    { name: 'Ananya Shah', email: 'manager@workloadwise.demo', role: 'MANAGER', department: 'Engineering' },
    { name: 'Rohan Patel', email: 'employee@workloadwise.demo', role: 'EMPLOYEE', department: 'Engineering' },
    { name: 'Diya Nair', email: 'diya@workloadwise.demo', role: 'EMPLOYEE', department: 'Design' },
    { name: 'Kabir Joshi', email: 'kabir@workloadwise.demo', role: 'EMPLOYEE', department: 'QA' }
  ];
  const users = [];
  for (const person of people) users.push(await prisma.user.upsert({ where: { email: person.email }, update: { name: person.name, role: person.role, department: person.department }, create: { ...person, passwordHash } }));
  const [, manager, rohan, diya, kabir] = users;
  const tasks = [
    { title: 'Build authentication screens', description: 'Finish responsive sign-in and validation states.', status: 'IN_PROGRESS', priority: 'HIGH', estimatedHours: 6, dueDate: days(1), assigneeId: rohan.id, creatorId: manager.id },
    { title: 'Review dashboard accessibility', description: 'Check keyboard navigation and contrast.', status: 'TODO', priority: 'MEDIUM', estimatedHours: 3, dueDate: days(3), assigneeId: diya.id, creatorId: manager.id },
    { title: 'API integration tests', description: 'Cover tasks and analytics endpoints.', status: 'BLOCKED', priority: 'URGENT', estimatedHours: 5, dueDate: days(-1), assigneeId: kabir.id, creatorId: manager.id },
    { title: 'Prepare sprint report', description: 'Summarize progress and risks.', status: 'DONE', priority: 'LOW', estimatedHours: 2, dueDate: days(-2), completedAt: days(-2), assigneeId: rohan.id, creatorId: manager.id },
    { title: 'Create task empty states', description: 'Design no-results and loading states.', status: 'IN_PROGRESS', priority: 'MEDIUM', estimatedHours: 4, dueDate: days(2), assigneeId: diya.id, creatorId: manager.id },
    { title: 'Verify release checklist', description: 'Confirm release readiness items.', status: 'TODO', priority: 'HIGH', estimatedHours: 4, dueDate: days(0), assigneeId: kabir.id, creatorId: manager.id },
    { title: 'Document API endpoints', description: 'Document payloads and error responses.', status: 'TODO', priority: 'LOW', estimatedHours: 2, dueDate: days(5), assigneeId: rohan.id, creatorId: manager.id }
  ];
  for (const task of tasks) await prisma.task.upsert({ where: { id: `demo-${task.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}` }, update: {}, create: { id: `demo-${task.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, ...task } });
  console.log('Seed complete. Demo password: DemoPass123!');
}
function days(n) { const d = new Date(); d.setDate(d.getDate()+n); return d; }
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
