
import { useEffect, useState } from 'react';
import {
  Plus, Search, SlidersHorizontal, CalendarDays, CircleCheck,
  Clock3, Trash2, X, Pencil, Timer, AlertTriangle, Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';
import SectionHeader from '../components/SectionHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import './TasksPage.css';

const initial = {
  title: '', description: '', priority: 'MEDIUM',
  estimatedHours: 2, dueDate: '', assigneeId: ''
};

function dateValue(value) {
  return value ? new Date(value).toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric'
  }) : 'No due date';
}

export default function TasksPage({ user, onNotice }) {
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initial);
  const [workTask, setWorkTask] = useState(null);
  const [logHours, setLogHours] = useState('1');
  const [logNote, setLogNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const manager = ['ADMIN', 'MANAGER'].includes(user.role);

  async function load() {
    setLoading(true);
    try {
      const [t, tm] = await Promise.all([api('/tasks'), api('/team')]);
      setTasks(t.tasks);
      setTeam(tm.team);
      if (manager) {
        try {
          const result = await api('/analytics/recommendations');
          setRecommendations(result.recommendations || []);
        } catch {
          setRecommendations([]);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveTask(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        estimatedHours: Number(form.estimatedHours),
        dueDate: form.dueDate
          ? new Date(`${form.dueDate}T12:00:00`).toISOString()
          : null,
        assigneeId: form.assigneeId || undefined
      };
      if (editing) {
        await api(`/tasks/${editing.id}`, {
          method: 'PATCH', body: JSON.stringify(payload)
        });
        onNotice('Task updated successfully.');
      } else {
        await api('/tasks', {
          method: 'POST', body: JSON.stringify(payload)
        });
        onNotice('Task created successfully.');
      }
      setShowForm(false);
      setEditing(null);
      setForm(initial);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(task, status) {
    try {
      await api(`/tasks/${task.id}`, {
        method: 'PATCH', body: JSON.stringify({ status })
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function logWork(e) {
    e.preventDefault();
    if (!workTask) return;
    setBusy(true);
    setError('');
    try {
      await api(`/tasks/${workTask.id}/work-logs`, {
        method: 'POST',
        body: JSON.stringify({ hours: Number(logHours), note: logNote })
      });
      setWorkTask(null);
      setLogHours('1');
      setLogNote('');
      onNotice('Work log saved. Remaining effort updated.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(task) {
    if (!confirm(`Delete “${task.title}”?`)) return;
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE' });
      await load();
      onNotice('Task deleted.');
    } catch (e) {
      setError(e.message);
    }
  }

  const visible = tasks.filter(task =>
    (filter === 'ALL' || task.status === filter) &&
    `${task.title} ${task.assignee?.name || ''}`
      .toLowerCase().includes(query.toLowerCase())
  );

  const active = tasks.filter(task => task.status !== 'DONE');
  const remainingTotal = active.reduce((sum, task) => sum + (task.remainingHours ?? task.estimatedHours), 0);
  const spentTotal = tasks.reduce((sum, task) => sum + (task.hoursSpent || 0), 0);
  const overdueCount = active.filter(task => task.overdue).length;

  return (
    <div className="tasks-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow-light">WORK MANAGEMENT</span>
          <h1>Tasks that move work forward.</h1>
          <p>Track actual effort, remaining work, deadlines and delivery status.</p>
        </div>
        {manager && <button className="primary-button" onClick={() => {
          setEditing(null); setForm(initial); setError(''); setShowForm(true);
        }}><Plus size={16}/> New task</button>}
      </div>

      {error && <div className="inline-error">{error}<button onClick={() => setError('')}><X size={14}/></button></div>}

      <div className="task-summary">
        <div><span>All tasks</span><strong>{tasks.length}</strong></div>
        <div><span>Remaining effort</span><strong>{Math.round(remainingTotal * 10) / 10}h</strong></div>
        <div><span>Time logged</span><strong>{Math.round(spentTotal * 10) / 10}h</strong></div>
        <div><span>Overdue</span><strong className={overdueCount ? 'ww-danger-text' : ''}>{overdueCount}</strong></div>
      </div>

      {manager && recommendations.length > 0 && (
        <section className="ww-recommendations panel">
          <SectionHeader title="Workload recommendations" subtitle="Rule-based suggestions for manager review; no task is moved automatically."/>
          {recommendations.map(item => (
            <article className="ww-recommendation" key={item.id}>
              <Sparkles size={18}/>
              <div className="ww-rec-copy">
                <strong>{item.taskTitle}</strong>
                <p>{item.reason}</p>
                <small>{item.remainingHours}h remaining · Suggested: {item.from.name} → {item.to.name}</small>
              </div>
              <button className="secondary-button" onClick={async () => {
                if (!confirm(`Reassign "${item.taskTitle}" to ${item.to.name}?`)) return;
                try {
                  await api(`/tasks/${item.taskId}`, {
                    method: 'PATCH', body: JSON.stringify({ assigneeId: item.to.id })
                  });
                  onNotice('Task reassigned with manager approval.');
                  await load();
                } catch (e) { setError(e.message); }
              }}>Approve reassignment</button>
            </article>
          ))}
        </section>
      )}

      <section className="panel task-list-panel">
        <SectionHeader title="Task board" subtitle="Estimated effort, actual time, remaining work and ownership"/>
        <div className="task-controls">
          <div className="task-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks or people..."/></div>
          <div className="filter-control"><SlidersHorizontal size={14}/><select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All statuses</option><option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option><option value="BLOCKED">Blocked</option><option value="DONE">Done</option>
          </select></div>
        </div>

        {loading ? <LoadingState label="Loading tasks..."/> : <div className="task-cards">
          {visible.map(task => {
            const spent = task.hoursSpent || 0;
            const remaining = task.remainingHours ?? task.estimatedHours;
            const progress = task.completionPercent || 0;
            return (
              <article className="task-card" key={task.id}>
                <div className="task-card-main">
                  <div className={`task-priority-dot ${task.priority.toLowerCase()}`}/>
                  <div className="task-card-copy">
                    <h3>{task.title}</h3>
                    <p>{task.description || 'No description added.'}</p>
                    <div className="task-meta">
                      <span><Clock3 size={13}/>{task.estimatedHours}h estimate</span>
                      <span><Timer size={13}/>{spent}h logged</span>
                      <span><CalendarDays size={13}/>{dateValue(task.dueDate)}</span>
                      <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      {task.overdue && <span className="ww-risk-tag"><AlertTriangle size={12}/> Overdue</span>}
                      {!task.overdue && task.dueSoon && <span className="ww-soon-tag">Due within 48h</span>}
                    </div>
                    <div className="ww-effort">
                      <div className="ww-effort-label"><span>Estimated completion</span><strong>{progress}%</strong></div>
                      <div className="ww-effort-track"><span style={{width:`${progress}%`}}/></div>
                      <div className="ww-effort-label"><span>Remaining effort</span><strong>{remaining}h</strong></div>
                    </div>
                    {task.workLogs?.length > 0 && (
                      <details className="ww-work-history">
                        <summary>Work history ({task.workLogs.length} entries)</summary>
                        {task.workLogs.map(log => (
                          <div className="ww-log-row" key={log.id}>
                            <span><strong>{log.hours}h</strong> · {log.user?.name || 'Team member'}</span>
                            <small>{new Date(log.createdAt).toLocaleString()}</small>
                            {log.note && <p>{log.note}</p>}
                          </div>
                        ))}
                      </details>
                    )}
                  </div>
                </div>
                <div className="task-card-actions">
                  <div className="assignee-chip"><span>{task.assignee?.name?.split(' ').map(n=>n[0]).slice(0,2).join('')}</span>{task.assignee?.name || 'Unassigned'}</div>
                  <select aria-label="Task status" className={`task-status-select ${task.status.toLowerCase()}`} value={task.status} onChange={e => changeStatus(task, e.target.value)}>
                    <option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option>
                    <option value="BLOCKED">Blocked</option><option value="DONE">Done</option>
                  </select>
                  {task.status !== 'DONE' && <button className="ww-log-button" onClick={() => {setWorkTask(task);setLogHours('1');setLogNote('');setError('');}}><Timer size={14}/> Log work</button>}
                  {manager && <>
                    <button className="delete-task" title="Edit task" aria-label={`Edit ${task.title}`} onClick={() => {
                      setEditing(task);
                      setError('');
                      setForm({
                        title: task.title, description: task.description || '',
                        priority: task.priority, estimatedHours: task.estimatedHours,
                        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0,10) : '',
                        assigneeId: task.assigneeId || task.assignee?.id || ''
                      });
                      setShowForm(true);
                    }}><Pencil size={15}/></button>
                    <button className="delete-task" title="Delete task" onClick={() => remove(task)}><Trash2 size={15}/></button>
                  </>}
                </div>
              </article>
            );
          })}
          {visible.length === 0 && <div className="empty-state"><CircleCheck size={24}/><p>No tasks match this view.</p><small>Try another filter or create a new task.</small></div>}
        </div>}
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setShowForm(false);}}>
        <form className="task-modal" onSubmit={saveTask}>
          <div className="modal-heading"><div><span className="eyebrow-light">WORK ITEM</span><h2>{editing ? 'Edit task' : 'Create a task'}</h2></div>
            <button type="button" className="modal-close" onClick={() => {setShowForm(false);setEditing(null);setError('');}}><X size={18}/></button>
          </div>
          <label>Task title<input required minLength="2" maxLength="160" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Review API integration"/></label>
          <label>Description<textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What needs to be done?"/></label>
          <div className="form-two-col">
            <label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label>
            <label>Estimated hours<input type="number" min="0.25" max="500" step="0.25" required value={form.estimatedHours} onChange={e=>setForm({...form,estimatedHours:e.target.value})}/></label>
          </div>
          <div className="form-two-col">
            <label>Due date<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label>
            <label>Assign to<select value={form.assigneeId} onChange={e=>setForm({...form,assigneeId:e.target.value})}><option value="">Me ({user.name})</option>{team.filter(p=>p.id!==user.id).map(p=><option key={p.id} value={p.id}>{p.name} · {p.department}</option>)}</select></label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>{setShowForm(false);setEditing(null);setError('');}}>Cancel</button><button className="primary-button" disabled={busy}>{busy?'Saving...':editing?'Save changes':'Create task'} {editing?<Pencil size={15}/>:<Plus size={15}/>}</button></div>
        </form>
      </div>}

      {workTask && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setWorkTask(null);}}>
        <form className="task-modal" onSubmit={logWork}>
          <div className="modal-heading"><div><span className="eyebrow-light">TASK PROGRESS</span><h2>Log work</h2><p>{workTask.title}</p></div><button type="button" className="modal-close" onClick={()=>setWorkTask(null)}><X size={18}/></button></div>
          <label>Hours worked in this session<input type="number" min="0.25" max="24" step="0.25" required value={logHours} onChange={e=>setLogHours(e.target.value)}/></label>
          <label>What did you work on?<textarea rows="3" maxLength="1000" value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="Describe completed work or progress..."/></label>
          <p className="ww-form-hint">Estimated: {workTask.estimatedHours}h · Previously logged: {workTask.hoursSpent || 0}h · Estimated remaining: {workTask.remainingHours ?? workTask.estimatedHours}h</p>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setWorkTask(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy?'Saving...':'Save work log'}</button></div>
        </form>
      </div>}
    </div>
  );
}
