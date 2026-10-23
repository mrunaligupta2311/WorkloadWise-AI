import { useEffect, useMemo, useState } from 'react';
import { Bell, Menu, Search, X, Users, ListTodo, AlertTriangle, Clock3 } from 'lucide-react';
import { api } from '../services/api.js';
import './Topbar.css';

export default function Topbar({ page, user, onMenu, setPage }) {
  const [panel, setPanel] = useState('');
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  async function openPanel(name) {
    if (panel === name) {
      setPanel('');
      return;
    }

    setPanel(name);
    setLoadError('');
    setLoading(true);

    try {
      if (name === 'search') {
        const [taskData, teamData] = await Promise.all([
          api('/tasks'),
          api('/team')
        ]);
        setTasks(taskData.tasks || []);
        setTeam(teamData.team || []);
      } else {
        const taskData = await api('/tasks');
        setTasks(taskData.tasks || []);
      }
    } catch (error) {
      setLoadError(error.message || 'Unable to load workspace data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function onEscape(event) {
      if (event.key === 'Escape') setPanel('');
    }
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const taskResults = useMemo(
    () => tasks.filter(task =>
      `${task.title || ''} ${task.description || ''} ${task.assignee?.name || ''}`
        .toLowerCase().includes(normalizedQuery)
    ).slice(0, 6),
    [tasks, normalizedQuery]
  );
  const teamResults = useMemo(
    () => team.filter(person =>
      `${person.name || ''} ${person.department || ''} ${person.role || ''}`
        .toLowerCase().includes(normalizedQuery)
    ).slice(0, 5),
    [team, normalizedQuery]
  );

  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
      if (task.status === 'DONE') return false;
      const blocked = task.status === 'BLOCKED';
      const overdue = task.dueDate && new Date(task.dueDate) < today;
      return blocked || overdue;
    }).map(task => ({
      ...task,
      alertReason: task.status === 'BLOCKED'
        ? 'Blocked task'
        : 'Overdue task'
    })).slice(0, 8);
  }, [tasks]);

  function goTo(destination) {
    setPage?.(destination);
    setPanel('');
    setQuery('');
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle" aria-label="Open navigation" onClick={onMenu}>
          <Menu size={20} />
        </button>
        <div>
          <div className="breadcrumb">WORKSPACE <span>/</span> <b>{page.toUpperCase()}</b></div>
          <h2>{page === 'Overview' ? `Good to see you, ${user.name.split(' ')[0]} 👋` : page}</h2>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="today-chip"><span className="status-dot" /> Your workspace is active</div>
        <button className="icon-button" aria-label="Search" aria-expanded={panel === 'search'} onClick={() => openPanel('search')}>
          <Search size={18} />
        </button>
        <button className="icon-button notification" aria-label="Notifications" aria-expanded={panel === 'notifications'} onClick={() => openPanel('notifications')}>
          <Bell size={18} />
          {alerts.length > 0 && <i />}
        </button>
        <div className="top-avatar">{user.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
      </div>

      {panel && (
        <section className="topbar-popover" role="dialog" aria-label={panel === 'search' ? 'Workspace search' : 'Task alerts'}>
          <div className="topbar-popover-heading">
            <div>
              <span className="eyebrow-light">{panel === 'search' ? 'FIND WORK' : 'WORKSPACE ACTIVITY'}</span>
              <h3>{panel === 'search' ? 'Search workspace' : 'Task alerts'}</h3>
            </div>
            <button className="topbar-close" aria-label="Close panel" onClick={() => setPanel('')}><X size={17} /></button>
          </div>

          {panel === 'search' && (
            <label className="topbar-search-field">
              <Search size={16} />
              <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks or team members..." aria-label="Search tasks or team members" />
            </label>
          )}

          {loading ? <p className="topbar-panel-message">Loading workspace data…</p> :
            loadError ? <p className="topbar-panel-error" role="alert">{loadError}</p> :
            panel === 'search' ? (
              <div className="topbar-search-results">
                {(!normalizedQuery || taskResults.length === 0) && (!normalizedQuery || teamResults.length === 0) ? (
                  <p className="topbar-panel-message">{normalizedQuery ? 'No matching tasks or team members.' : 'Type to search tasks, descriptions, people, or departments.'}</p>
                ) : (
                  <>
                    {normalizedQuery && taskResults.length > 0 && <>
                      <p className="topbar-result-label">TASKS</p>
                      {taskResults.map(task => (
                        <button className="topbar-result" key={task.id} onClick={() => goTo('Tasks')}>
                          <ListTodo size={16} />
                          <span><strong>{task.title}</strong><small>{task.assignee?.name || 'Unassigned'} · {task.status.replace('_', ' ')}</small></span>
                        </button>
                      ))}
                    </>}
                    {normalizedQuery && teamResults.length > 0 && <>
                      <p className="topbar-result-label">TEAM</p>
                      {teamResults.map(person => (
                        <button className="topbar-result" key={person.id} onClick={() => goTo('Team')}>
                          <Users size={16} />
                          <span><strong>{person.name}</strong><small>{person.department} · {person.role.toLowerCase()}</small></span>
                        </button>
                      ))}
                    </>}
                  </>
                )}
              </div>
            ) : (
              <div className="topbar-alert-list">
                {alerts.length === 0 ? (
                  <p className="topbar-panel-message">No blocked or overdue tasks right now.</p>
                ) : alerts.map(task => (
                  <button className="topbar-result" key={task.id} onClick={() => goTo('Tasks')}>
                    {task.alertReason === 'Blocked task' ? <AlertTriangle size={16} /> : <Clock3 size={16} />}
                    <span><strong>{task.title}</strong><small>{task.alertReason}{task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}</small></span>
                  </button>
                ))}
                <p className="topbar-panel-footnote">Alerts are calculated from current task status and due dates.</p>
              </div>
            )
          }
        </section>
      )}
    </header>
  );
}
