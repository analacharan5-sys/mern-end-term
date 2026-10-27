import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Users, Clock, Calendar, CheckCircle2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function QueueStatusPage({ targetAppointment }) {
  const { user, isAdmin } = useAuth();
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(
    targetAppointment?.serviceId?._id || targetAppointment?.serviceId || ''
  );
  const [date, setDate] = useState(
    targetAppointment?.slotId?.date || new Date().toISOString().split('T')[0]
  );
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Load services list
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.get('/api/services');
        if (res.success && res.services.length > 0) {
          setServices(res.services);
          if (!selectedServiceId) {
            setSelectedServiceId(res.services[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    }
    loadServices();
  }, []);

  // Fetch queue data
  const fetchQueue = async () => {
    if (!selectedServiceId) return;
    try {
      const res = await api.get(`/api/queue/service/${selectedServiceId}?date=${date}`);
      if (res.success) {
        setQueueData(res);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedServiceId, date]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchQueue();
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, selectedServiceId, date]);

  // Find if current user has a ticket in this queue
  const myQueueTicket = queueData?.queue?.find((item) => {
    if (targetAppointment && item.id === targetAppointment._id) return true;
    return false;
  }) || (targetAppointment && targetAppointment.serviceId?._id === selectedServiceId ? targetAppointment : null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Campus Queue Status</h1>
          <p className="page-subtitle">
            Real-time queue tracking, position monitoring, and service desk flow
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={14} className={autoRefresh ? 'spin' : ''} />
            {autoRefresh ? 'Auto-refreshing (10s)' : 'Auto-refresh paused'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchQueue}>
            Refresh Now
          </button>
        </div>
      </div>

      {/* Selector Controls */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1rem 1.25rem' }}>
        <div className="grid-2" style={{ gap: '1rem' }}>
          <div>
            <label className="form-label">Campus Service Department</label>
            <select
              className="form-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              {services.map((svc) => (
                <option key={svc._id} value={svc._id}>
                  {svc.name} ({svc.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Queue Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Personalized Ticket Banner if viewing own appointment */}
      {targetAppointment && (
        <div className="queue-hero-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="queue-tag">
                <Sparkles size={14} /> Your Active Ticket
              </span>
              <div className="queue-hero-number">
                #{targetAppointment.queueNumber}
              </div>
              <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>
                Service: <strong>{targetAppointment.serviceId?.name}</strong> • Time: <strong>{targetAppointment.slotId?.startTime} – {targetAppointment.slotId?.endTime}</strong>
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: 'var(--radius)', padding: '1rem 1.5rem', textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Status
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, textTransform: 'capitalize', marginTop: '0.2rem' }}>
                {targetAppointment.status === 'checked_in' ? 'Checked In (Waiting)' : targetAppointment.status}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.5rem' }}>
                {targetAppointment.queue?.aheadCount !== undefined
                  ? `${targetAppointment.queue.aheadCount} ahead • ~${targetAppointment.queue.estimatedWaitMinutes}m wait`
                  : 'In active line'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue Statistics Cards */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
            Currently Serving
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
            {queueData?.currentlyServing ? `#${queueData.currentlyServing.queueNumber}` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
            {queueData?.currentlyServing ? queueData.currentlyServing.studentName : 'No active student'}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
            In Waiting Line
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning-text)' }}>
            {queueData?.activeQueueCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Active appointments</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
            Served Today
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
            {queueData?.completedTodayCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Completed sessions</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
            Cancelled Today
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gray-400)' }}>
            {queueData?.cancelledTodayCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Released spots</div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            Live Queue Board — {queueData?.service?.name || 'Department'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>

        {!queueData || queueData.queue.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '2.5rem 1rem' }}>
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">The queue is currently empty</h3>
            <p className="empty-state-text">
              There are no students in line for {queueData?.service?.name || 'this service'} on {date}.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Ticket</th>
                  <th>Student</th>
                  <th>Slot Time</th>
                  <th>Status</th>
                  <th>Est. Wait</th>
                </tr>
              </thead>
              <tbody>
                {queueData.queue.map((item, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: isFirst ? 'var(--primary-light)' : 'transparent',
                        fontWeight: isFirst ? 600 : 400
                      }}
                    >
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: isFirst ? 'var(--primary)' : 'var(--gray-200)', color: isFirst ? '#fff' : 'var(--gray-700)', fontSize: '0.75rem', fontWeight: 700 }}>
                          {item.position}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                          #{item.queueNumber}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <div>{item.studentName}</div>
                          {item.studentId && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                              ID: {item.studentId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {item.startTime} – {item.endTime}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${item.status}`}>
                          {item.status === 'checked_in' ? 'Checked In' : 'Booked'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                          {item.position === 1 ? 'Serving Now' : `~${item.estimatedWaitMinutes} min`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
