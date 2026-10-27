import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Clock, Calendar, MapPin, Users, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function MyAppointmentsPage({ onSelectAppointmentForQueue }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/appointments/my');
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve your appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCheckIn = async (appointmentId) => {
    setActionLoading(appointmentId);
    try {
      const res = await api.patch(`/api/appointments/${appointmentId}/check-in`);
      if (res.success) {
        // Refresh local state
        loadAppointments();
      }
    } catch (err) {
      alert(err.message || 'Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (appointmentId) => {
    setActionLoading(appointmentId);
    try {
      const res = await api.patch(`/api/appointments/${appointmentId}/cancel`, {
        reason: 'Cancelled by student via portal'
      });
      if (res.success) {
        setConfirmCancelId(null);
        loadAppointments();
      }
    } catch (err) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const activeAppointments = appointments.filter((a) =>
    ['booked', 'checked_in'].includes(a.status)
  );

  const historyAppointments = appointments.filter((a) =>
    ['completed', 'cancelled'].includes(a.status)
  );

  const displayedList = activeTab === 'active' ? activeAppointments : historyAppointments;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Appointments & Bookings</h1>
          <p className="page-subtitle">
            Manage your scheduled campus visits, check in upon arrival, and track your queue status
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.75rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('active')}
        >
          Active & Upcoming ({activeAppointments.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
        >
          History & Completed ({historyAppointments.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--gray-500)' }}>Loading your appointments...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : displayedList.length === 0 ? (
        <div className="empty-state">
          <Calendar className="empty-state-icon" />
          <h3 className="empty-state-title">
            {activeTab === 'active' ? 'No active appointments' : 'No past appointments'}
          </h3>
          <p className="empty-state-text">
            {activeTab === 'active'
              ? 'You do not have any upcoming bookings. Check available slots to book an appointment with campus services.'
              : 'Completed or cancelled appointments will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid-2">
          {displayedList.map((apt) => {
            const isBooked = apt.status === 'booked';
            const isCheckedIn = apt.status === 'checked_in';
            const isCompleted = apt.status === 'completed';
            const isCancelled = apt.status === 'cancelled';

            return (
              <div
                key={apt._id}
                className="card"
                style={{
                  borderLeft: isCheckedIn
                    ? '4px solid var(--warning)'
                    : isCompleted
                    ? '4px solid var(--success)'
                    : isCancelled
                    ? '4px solid var(--gray-400)'
                    : '4px solid var(--primary)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="badge badge-booked" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                      {apt.serviceId?.category || 'General'}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                      {apt.serviceId?.name}
                    </h3>
                  </div>

                  <span className={`badge badge-${apt.status}`}>
                    {apt.status === 'checked_in' ? 'Checked In' : apt.status}
                  </span>
                </div>

                {/* Queue Position Highlight if active */}
                {(isBooked || isCheckedIn) && apt.queue && (
                  <div
                    style={{
                      background: isCheckedIn ? 'var(--warning-bg)' : 'var(--primary-light)',
                      border: `1px solid ${isCheckedIn ? 'var(--warning-border)' : 'var(--primary-border)'}`,
                      borderRadius: 'var(--radius)',
                      padding: '0.75rem 1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: isCheckedIn ? 'var(--warning-text)' : 'var(--primary)' }}>
                        Queue Ticket
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isCheckedIn ? 'var(--warning-text)' : 'var(--primary)' }}>
                        #{apt.queueNumber}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                        Position: {apt.queue.positionInLine === 1 ? 'Next Up!' : `#${apt.queue.positionInLine}`}
                      </div>
                      <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                        {apt.queue.aheadCount} {apt.queue.aheadCount === 1 ? 'person' : 'people'} ahead
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={15} style={{ color: 'var(--primary)' }} />
                    <span><strong>Date:</strong> {apt.slotId?.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={15} style={{ color: 'var(--primary)' }} />
                    <span><strong>Time:</strong> {apt.slotId?.startTime} – {apt.slotId?.endTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={15} style={{ color: 'var(--primary)' }} />
                    <span><strong>Location:</strong> {apt.serviceId?.location}</span>
                  </div>
                  {apt.reason && (
                    <div style={{ marginTop: '0.5rem', background: 'var(--gray-50)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <strong>Reason:</strong> {apt.reason}
                    </div>
                  )}
                  {apt.cancellationReason && (
                    <div style={{ marginTop: '0.5rem', background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <strong>Cancellation:</strong> {apt.cancellationReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
                  {isBooked && (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleCheckIn(apt._id)}
                      disabled={actionLoading === apt._id}
                    >
                      {actionLoading === apt._id ? <div className="spinner" /> : <><CheckCircle size={15} /> Check In Now</>}
                    </button>
                  )}

                  {(isBooked || isCheckedIn) && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onSelectAppointmentForQueue(apt)}
                    >
                      <Users size={15} /> Track Live Queue
                    </button>
                  )}

                  {(isBooked || isCheckedIn) && (
                    <>
                      {confirmCancelId === apt._id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>Confirm?</span>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancel(apt._id)}
                            disabled={actionLoading === apt._id}
                          >
                            Yes, Cancel
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setConfirmCancelId(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setConfirmCancelId(apt._id)}
                        >
                          <XCircle size={15} /> Cancel Booking
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
