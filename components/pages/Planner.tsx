'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { getCustomerName } from '@/lib/crm-utils';
import { useStore } from '@/hooks/useStore';

type Task = {
  id?: string;
  title?: string;
  assignee?: string;
  date?: string;
  priority?: string;
  dept?: string;
  status?: string;
  notes?: string;
};

const TEAM = ['Tai Pham', 'Linh N.', 'Minh T.', 'Huong L.', 'Khoa V.'];

function LeadRow({
  name,
  tour,
  pax,
  value,
  followUpDate,
  stage,
  nextAction,
  overdue,
  onDone,
}: {
  name: string;
  tour: string;
  pax: number;
  value: number;
  followUpDate?: string;
  stage: string;
  nextAction?: string;
  overdue?: boolean;
  onDone?: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isOd = followUpDate && followUpDate < today;
  const daysDue = followUpDate ? Math.round((new Date(today).getTime() - new Date(followUpDate).getTime()) / 86400000) : 0;

  return (
    <div className="hub-row" style={isOd && overdue ? { background: '#FFF8F7' } : undefined}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--m)' }}>
          {tour} · {pax > 0 ? `${pax} pax · ` : ''}
          {value > 0 ? `$${fmt(value)}` : '—'}
        </div>
        {nextAction && <div style={{ fontSize: 11.5, color: 'var(--gd)', marginTop: 2 }}>→ {nextAction}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span className={`bdg ${isOd ? 'bdg-r' : 'bdg-a'}`} style={{ fontSize: 10 }}>
          {followUpDate || '—'}
          {isOd && daysDue > 0 ? ` (${daysDue}d late)` : ''}
        </span>
        <span className="bdg bdg-w" style={{ fontSize: 10 }}>
          {stage}
        </span>
        {onDone && (
          <button type="button" className="hub-action-btn hub-done" onClick={onDone}>
            ✓ Done
          </button>
        )}
      </div>
    </div>
  );
}

export default function Planner() {
  const leads = useStore((s) => s.leads);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const tasks = useStore((s) => s.tasks) as Task[];
  const addTask = useStore((s) => s.addTask);
  const updateLead = useStore((s) => s.updateLead);

  const [weekOffset, setWeekOffset] = useState(0);
  const [teamF, setTeamF] = useState('');
  const [plannerView, setPlannerView] = useState<'strip' | 'grid'>('strip');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    assignee: 'Tai Pham',
    date: '',
    priority: 'medium',
    dept: 'Sales',
    status: 'todo',
    notes: '',
  });

  const today = new Date().toISOString().split('T')[0];
  const allTasks = tasks as Task[];

  const secA = useMemo(
    () =>
      leads
        .filter((l) => l.followUpDate === today && l.stage !== 'Completed' && l.stage !== 'Lost')
        .sort((a, b) => (b.value || 0) - (a.value || 0)),
    [leads, today]
  );

  const secB = useMemo(
    () =>
      leads
        .filter((l) => l.followUpDate && l.followUpDate < today && l.stage !== 'Completed' && l.stage !== 'Lost')
        .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || '')),
    [leads, today]
  );

  const secC = useMemo(() => bookings.filter((b) => b.status === 'On Tour' || b.status === 'Confirmed').slice(0, 8), [bookings]);

  const secD = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 60);
    return leads
      .filter((l) => l.stage === 'Quoted' || l.stage === 'Negotiation')
      .filter((l) => (l.value || 0) > 5000)
      .slice(0, 6);
  }, [leads, today]);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7 - d.getDay());
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekDays[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const todayTasks = allTasks.filter((t) => t.date === today && (!teamF || t.assignee === teamF));
  const doneCount = allTasks.filter((t) => t.status === 'done').length;
  const totalCount = allTasks.length;

  function markDone(leadId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateLead(leadId, { followUpDate: tomorrow.toISOString().split('T')[0] });
  }

  function saveTask() {
    if (!taskForm.title.trim()) return;
    addTask({
      id: `TK-${Date.now()}`,
      ...taskForm,
      date: taskForm.date || today,
    });
    setShowTaskModal(false);
    setTaskForm({ title: '', assignee: 'Tai Pham', date: '', priority: 'medium', dept: 'Sales', status: 'todo', notes: '' });
  }

  return (
    <div>
      <div className="planner-hub-bar">
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📋 Action Hub</span>
        <span className="hub-pill">{secA.length} today</span>
        {secB.length > 0 && <span className="hub-pill hub-pill-red">{secB.length} overdue</span>}
        <span className="hub-pill hub-pill-gold">{secC.length} tours this week</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Live data from Sales Pipeline · updated on page load</span>
      </div>

      {[
        { id: 'A', title: "📋 A — Today's Priority Actions", count: secA.length, bg: 'var(--gl)', items: secA, overdue: false },
        { id: 'B', title: '⚠️ B — Overdue Follow-ups', count: secB.length, bg: 'var(--amb-l)', items: secB, overdue: true },
      ].map((sec) => (
        <div key={sec.id} className="card" style={{ marginBottom: 14 }}>
          <div className="card-hd" style={{ background: sec.bg }}>
            <span className="card-title">{sec.title}</span>
            <span className={`bdg ${sec.id === 'B' ? 'bdg-a' : 'bdg-g'}`}>{sec.count}</span>
          </div>
          <div style={{ padding: 0 }}>
            {sec.items.length ? (
              (sec.items as typeof leads).map((l) => (
                <LeadRow
                  key={l.id}
                  name={getCustomerName(customers, l.custId)}
                  tour={l.tour}
                  pax={Number(l.pax) || 0}
                  value={l.value || 0}
                  followUpDate={l.followUpDate}
                  stage={l.stage}
                  nextAction={l.nextAction}
                  overdue={sec.overdue}
                  onDone={() => markDone(l.id)}
                />
              ))
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--m)', fontSize: 12.5 }}>✅ No items in this section.</div>
            )}
          </div>
        </div>
      ))}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd">
          <span className="card-title">✈️ C — This Week&apos;s Bookings in Execution</span>
          <span className="bdg bdg-b">{secC.length}</span>
        </div>
        <div style={{ padding: 0 }}>
          {secC.length ? (
            secC.map((b) => (
              <div key={b.id} className="hub-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{getCustomerName(customers, b.custId)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--m)' }}>
                    {b.tour} · {b.start} · {b.pax} pax
                  </div>
                </div>
                <span className={`bdg ${b.status === 'On Tour' ? 'bdg-g' : 'bdg-b'}`}>{b.status}</span>
              </div>
            ))
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--m)' }}>No bookings in execution this week.</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-hd" style={{ background: 'var(--red-l)' }}>
          <span className="card-title" style={{ color: 'var(--red)' }}>
            🔔 D — Urgent: Confirm Soon (depart &lt;60 days)
          </span>
          <span className="bdg bdg-r">{secD.length}</span>
        </div>
        <div style={{ padding: 0 }}>
          {secD.map((l) => (
            <LeadRow
              key={l.id}
              name={getCustomerName(customers, l.custId)}
              tour={l.tour}
              pax={Number(l.pax) || 0}
              value={l.value || 0}
              followUpDate={l.month}
              stage={l.stage}
            />
          ))}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '2px dashed var(--b)', marginBottom: 20 }} />
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--m)', marginBottom: 12 }}>
        📆 Task Calendar & Team Planner
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="planner-nav">
          <button type="button" onClick={() => setWeekOffset((w) => w - 1)}>
            ‹
          </button>
          <span>{weekLabel}</span>
          <button type="button" onClick={() => setWeekOffset((w) => w + 1)}>
            ›
          </button>
        </div>
        <button className="btn btn-s btn-sm" type="button" onClick={() => setWeekOffset(0)}>
          Today
        </button>
        <div className="planner-view-toggle">
          <button type="button" className={plannerView === 'strip' ? 'on' : ''} onClick={() => setPlannerView('strip')}>
            ☷ Strip
          </button>
          <button type="button" className={plannerView === 'grid' ? 'on' : ''} onClick={() => setPlannerView('grid')}>
            ☷ Grid
          </button>
        </div>
        <select value={teamF} onChange={(e) => setTeamF(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--b)', borderRadius: 7, fontSize: 12 }}>
          <option value="">All Team Members</option>
          {TEAM.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-p btn-sm" type="button" onClick={() => setShowTaskModal(true)}>
          + Add Task
        </button>
      </div>

      {plannerView === 'strip' ? (
        <div className="planner-week-grid">
          {weekDays.map((day) => {
            const dayTasks = allTasks.filter((t) => t.date === day && (!teamF || t.assignee === teamF));
            const isToday = day === today;
            return (
              <div key={day} className={`planner-day-col${isToday ? ' planner-day-today' : ''}`}>
                <div className="planner-day-hd">
                  {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                {dayTasks.map((t, i) => (
                  <div key={t.id || i} className={`planner-task planner-priority-${t.priority || 'medium'}`}>
                    {t.title}
                  </div>
                ))}
                {!dayTasks.length && <div style={{ fontSize: 10, color: 'var(--m)', padding: 4 }}>—</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="planner-team-grid">
          <table className="tbl">
            <thead>
              <tr>
                <th>Team Member</th>
                {weekDays.map((day) => (
                  <th key={day} style={{ fontSize: 10.5, textAlign: 'center' }}>
                    {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAM.filter((m) => !teamF || m === teamF).map((member) => (
                <tr key={member}>
                  <td style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{member}</td>
                  {weekDays.map((day) => {
                    const dayTasks = allTasks.filter((t) => t.date === day && t.assignee === member);
                    return (
                      <td key={day} className={`planner-grid-cell${day === today ? ' today' : ''}`}>
                        {dayTasks.map((t, i) => (
                          <div key={t.id || i} className={`planner-grid-task planner-priority-${t.priority || 'medium'}`}>
                            {t.title}
                          </div>
                        ))}
                        {!dayTasks.length && <span style={{ color: 'var(--m)', fontSize: 10 }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 16 }}>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">📋 Today&apos;s Tasks</span>
            <span style={{ fontSize: 11, color: 'var(--m)' }}>{today}</span>
          </div>
          <div style={{ padding: 0 }}>
            {todayTasks.length ? (
              todayTasks.map((t, i) => (
                <div key={t.id || i} className="hub-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--m)' }}>
                      {t.assignee} · {t.dept}
                    </div>
                  </div>
                  <span className={`bdg ${t.priority === 'high' ? 'bdg-r' : t.priority === 'low' ? 'bdg-g' : 'bdg-a'}`}>{t.priority}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: 16, color: 'var(--m)' }}>No tasks for today.</div>
            )}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--b)' }}>
            <button className="btn btn-s btn-sm" type="button" onClick={() => setShowTaskModal(true)}>
              + Add Task for Today
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">📊 Progress Overview</span>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--g)' }}>
                {totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--m)', marginTop: 4 }}>
                {doneCount} of {totalCount} tasks done
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">⚡ Upcoming Deadlines</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {allTasks
                .filter((t) => t.date && t.date >= today)
                .slice(0, 5)
                .map((t, i) => (
                  <div key={t.id || i} style={{ fontSize: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.title?.slice(0, 28)}</span>
                    <span style={{ color: 'var(--m)' }}>{t.date}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="modal-overlay open" onClick={() => setShowTaskModal(false)}>
          <div className="modal" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Add Task</span>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }} onClick={() => setShowTaskModal(false)}>
                ×
              </button>
            </div>
            <div className="fg">
              <label className="lbl">Task Title *</label>
              <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Send proposal to James Miller" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="fg">
                <label className="lbl">Assigned To</label>
                <select value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}>
                  {TEAM.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Due Date</label>
                <input type="date" value={taskForm.date} onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="fg">
                <label className="lbl">Priority</label>
                <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Department</label>
                <select value={taskForm.dept} onChange={(e) => setTaskForm({ ...taskForm, dept: e.target.value })}>
                  <option>Sales</option>
                  <option>Operations</option>
                  <option>Finance</option>
                  <option>Marketing</option>
                  <option>Management</option>
                </select>
              </div>
            </div>
            <div className="fg">
              <label className="lbl">Status</label>
              <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="review">Needs Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Notes</label>
              <textarea value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} placeholder="Additional details, links, or context..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn btn-s" type="button" onClick={() => setShowTaskModal(false)}>
                Cancel
              </button>
              <button className="btn btn-p" type="button" onClick={saveTask}>
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
