import { useEffect, useState } from 'react';
import {
  Users, BriefcaseBusiness, Clock3, Search, Sparkles,
  ArrowUpRight, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api.js';
import SectionHeader from '../components/SectionHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import './TeamPage.css';

const statusInfo = {
  OVERLOADED: {
    label: 'Overloaded',
    message: 'Workload exceeds weekly capacity. Review priorities or redistribute tasks.',
    icon: AlertTriangle
  },
  HIGH: {
    label: 'High workload',
    message: 'Workload is at least 80% of weekly capacity. Monitor upcoming tasks.',
    icon: AlertTriangle
  },
  BALANCED: {
    label: 'Balanced',
    message: 'Current estimated workload is within the planning threshold.',
    icon: CheckCircle2
  },
  LOW: {
    label: 'Low workload',
    message: 'Capacity is available for additional tasks.',
    icon: CheckCircle2
  },
  NO_ACTIVE_WORK: {
    label: 'No active work',
    message: 'No active tasks are currently assigned.',
    icon: CheckCircle2
  }
};

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/team')
      .then(data => setTeam(data.team || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = team.filter(person =>
    `${person.name} ${person.department} ${person.role}`
      .toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="team-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow-light">PEOPLE & CAPACITY</span>
          <h1>Better work starts with your people.</h1>
          <p>Spot workload pressure and plan work more fairly.</p>
        </div>
      </div>

      <div className="team-summary">
        <div><Users size={18}/><span>Team members</span><strong>{team.length}</strong></div>
        <div><BriefcaseBusiness size={18}/><span>Departments</span><strong>{new Set(team.map(p => p.department)).size}</strong></div>
        <div><Clock3 size={18}/><span>Active task hours</span><strong>{team.reduce((sum, p) => sum + (p.workloadHours || 0), 0)}h</strong></div>
      </div>

      <section className="panel">
        <SectionHeader title="Your team" subtitle="Workload compared with weekly capacity"/>
        <div className="team-search">
          <Search size={16}/>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, department, or role"/>
        </div>

        {error && <div className="inline-error">{error}</div>}
        {loading ? <LoadingState label="Loading team..."/> : (
          <div className="team-grid">
            {visible.map((person, i) => {
              const status = statusInfo[person.workloadStatus] || statusInfo.BALANCED;
              const StatusIcon = status.icon;
              const capacity = person.workloadCapacityHours || 40;
              const hours = person.workloadHours || 0;
              const progress = Math.min(100, Math.round(hours / capacity * 100));

              return (
                <article className={`member-card workload-${person.workloadStatus?.toLowerCase() || 'balanced'}`} key={person.id}>
                  <div className="member-top">
                    <div className={`member-avatar member-${i % 5}`}>
                      {person.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="member-role">{person.role.toLowerCase()}</span>
                  </div>

                  <h3>{person.name}</h3>
                  <p className="member-dept">{person.department}</p>

                  <div className="member-stats">
                    <div><strong>{person.activeTasks}</strong><span>Active tasks</span></div>
                    <div><strong>{hours}h</strong><span>Active hours</span></div>
                    <div><strong>{person.taskCount}</strong><span>Total tasks</span></div>
                  </div>

                  <div className="member-risk">
                    <div>
                      <span>Weekly workload</span>
                      <b className={`risk-label ${person.workloadStatus?.toLowerCase() || 'balanced'}`}>
                        <StatusIcon size={13}/> {status.label}
                      </b>
                    </div>
                    <div className="member-track">
                      <span className={`workload-bar ${person.workloadStatus?.toLowerCase() || 'balanced'}`}
                        style={{ width: `${progress}%` }}/>
                    </div>
                    <div className="capacity-caption">
                      {hours}h assigned / {capacity}h capacity · {person.workloadUtilization}% used
                    </div>
                  </div>

                  <div className="member-tip">
                    <Sparkles size={14}/>
                    <span>{status.message}</span>
                  </div>
                </article>
              );
            })}
            {visible.length === 0 && !loading &&
              <div className="empty-state">No team members match your search.</div>}
          </div>
        )}
      </section>

      <div className="team-disclaimer">
        <Sparkles size={15}/>
        <span>Planning indicator only. Uses estimated hours for active tasks and a default 40-hour weekly capacity. Adjust capacity to reflect real availability before reassigning work.</span>
        <ArrowUpRight size={15}/>
      </div>
    </div>
  );
}
