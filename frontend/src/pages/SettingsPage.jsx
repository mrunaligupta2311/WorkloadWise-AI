import { useEffect, useState } from 'react';
import { UserRound, ShieldCheck, Bell, Sparkles, Check } from 'lucide-react';
import { api } from '../services/api.js';
import LoadingState from '../components/LoadingState.jsx';
import './SettingsPage.css';

export default function SettingsPage({ user, onNotice }) {
  const [notifications, setNotifications] = useState(true);
  const [insights, setInsights] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api('/settings')
      .then(({ preferences }) => {
        if (!active) return;
        setNotifications(preferences.notificationsEnabled);
        setInsights(preferences.workloadInsightsEnabled);
      })
      .catch(e => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  async function savePreferences() {
    setSaving(true);
    setError('');

    try {
      const { preferences } = await api('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationsEnabled: notifications,
          workloadInsightsEnabled: insights
        })
      });

      setNotifications(preferences.notificationsEnabled);
      setInsights(preferences.workloadInsightsEnabled);
      onNotice('Preferences saved to your account.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow-light">WORKSPACE PREFERENCES</span>
          <h1>A workspace that works for you.</h1>
          <p>Review your profile, privacy, and insight preferences.</p>
        </div>
      </div>

      <section className="panel settings-profile">
        <div className="settings-avatar">
          {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>
        <div className="settings-profile-info">
          <span>YOUR PROFILE</span>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <div className="profile-tags">
            <span>{user.role.toLowerCase()}</span>
            <span>{user.department}</span>
          </div>
        </div>
        <div className="verified-tag"><ShieldCheck size={15} /> Signed in</div>
      </section>

      <section className="panel settings-panel">
        <div className="settings-section-title">
          <div className="settings-section-icon"><UserRound size={17} /></div>
          <div>
            <h3>Profile details</h3>
            <p>Identity details from your organization account.</p>
          </div>
        </div>
        <div className="settings-fields">
          <label>Full name<input value={user.name} readOnly /></label>
          <label>Email address<input value={user.email} readOnly /></label>
          <label>Role<input value={user.role} readOnly /></label>
          <label>Department<input value={user.department} readOnly /></label>
        </div>
        <div className="read-only-note">
          <ShieldCheck size={14} /> Profile edits are managed by your workspace administrator.
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="settings-section-title">
          <div className="settings-section-icon"><Bell size={17} /></div>
          <div>
            <h3>Preferences</h3>
            <p>Choose what signals you want to see in this workspace.</p>
          </div>
        </div>

        {loading ? <LoadingState label="Loading saved preferences..." /> : (
          <>
            <div className="preference-row">
              <div>
                <strong>Workspace notifications</strong>
                <p>Show in-app messages when task actions complete.</p>
              </div>
              <button
                type="button"
                className={`toggle ${notifications ? 'on' : ''}`}
                onClick={() => setNotifications(v => !v)}
                aria-label="Toggle notifications"
                aria-pressed={notifications}
              ><span /></button>
            </div>

            <div className="preference-row">
              <div>
                <strong>Workload insight panel</strong>
                <p>Show rule-based workload signals on the overview page.</p>
              </div>
              <button
                type="button"
                className={`toggle ${insights ? 'on' : ''}`}
                onClick={() => setInsights(v => !v)}
                aria-label="Toggle workload insights"
                aria-pressed={insights}
              ><span /></button>
            </div>

            <button
              type="button"
              className="primary-button save-preferences"
              onClick={savePreferences}
              disabled={saving}
            >
              <Check size={15} /> {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </>
        )}

        {error && <div className="inline-error" role="alert">{error}</div>}
      </section>

      <div className="settings-security">
        <Sparkles size={16} />
        <div>
          <strong>People-first analytics</strong>
          <p>
            Workload indicators are estimates to support planning, not to rank people.
            Use context and manager judgment with every recommendation.
          </p>
        </div>
      </div>
    </div>
  );
}
