import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Users, CheckCircle, Clock, Calendar, Check, X, AlertCircle, FileText } from 'lucide-react';

export default function AdminBookingsPage() {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notesModal, setNotesModal] = useState(null); // appointment to edit notes/complete

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.get('/api/services?includeInactive=true');
        if (res.success) {
          setServices(res.services);
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    }
    loadServices();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedServiceId) query.append('serviceId', selectedServiceId);
      if (selectedStatus) query.append('status', selectedStatus);
      if (selectedDate) query.append('date', selectedDate);

      const res = await api.get(`/api/admin/appointments?${query.toString()}`);
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [selectedServiceId, selectedStatus, selectedDate]);

  const updateStatus = async (appointmentId, newStatus, notes, cancellationReason) => {
    setActionLoading(appointmentId);
    try {
      const res = await api.patch(`/api/admin/appointments/${appointmentId}/status`, {
        status: newStatus,
        notes,
        cancellationReason
      });
      if (res.success) {
        setNotesModal(null);
        loadAppointments();
      }
    } catch (err) {
      alert(err.message || 'Status update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Desk & Bookings Desk</h1>
          <p className="page-subtitle">
            Manage appointments, check in arriving students, and mark consultations completed
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div className="grid-3" style={{ gap: '1rem' }}>
          <div>
            <label className="form-label">Filter by Department</label>
            <select
              className="form-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              <option value="">All Services</option>
              {services.map((svc) => (
                <option key={svc._id} value={svc._id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Filter by Status</label>
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="booked">Booked (Upcoming)</option>
              <option value="checked_in">Checked In (In Queue)</option>
              <option value="completed">Completed (Served)</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="form-label">Filter by Date</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--gray-500)' }}>Loading bookings...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="empty-state" style={{ border: 'none' }}>
            <Users className="empty-state-icon" />
            <h4 className="empty-state-title">No bookings match the filters</h4>
            <p className="empty-state-text">
              Try adjusting the department, date, or status filter to see appointments.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Slot Time</th>
                  <th>Status</th>
                  <th>Reason / Notes</th>
                  <th style={{ textAlign: 'right' }}>Staff Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => {
                  const isBooked = apt.status === 'booked';
                  const isCheckedIn = apt.status === 'checked_in';
                  const isCompleted = apt.status === 'completed';
                  const isCancelled = apt.status === 'cancelled';

                  return (
                    <tr key={apt._id}>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                          #{apt.queueNumber}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                          {apt.userId?.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          ID: {apt.userId?.studentId || 'N/A'} • {apt.userId?.email}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{apt.serviceId?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                          {apt.serviceId?.location}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{apt.slotId?.date}</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gray-700)' }}>
                          {apt.slotId?.startTime} – {apt.slotId?.endTime}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${apt.status}`}>
                          {apt.status === 'checked_in' ? 'Checked In' : apt.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ maxWidth: '220px', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                          {apt.reason && <div><strong>Visit:</strong> {apt.reason}</div>}
                          {apt.notes && <div style={{ color: 'var(--primary)' }}><strong>Notes:</strong> {apt.notes}</div>}
                          {apt.cancellationReason && <div style={{ color: 'var(--danger)' }}><strong>Cancel:</strong> {apt.cancellationReason}</div>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {isBooked && (
                            <button
                              className="btn btn-warning btn-sm"
                              disabled={actionLoading === apt._id}
                              onClick={() => updateStatus(apt._id, 'checked_in')}
                            >
                              Check In
                            </button>
                          )}

                          {isCheckedIn && (
                            <button
                              className="btn btn-success btn-sm"
                              disabled={actionLoading === apt._id}
                              onClick={() => setNotesModal({ appointment: apt, nextStatus: 'completed' })}
                            >
                              Complete
                            </button>
                          )}

                          {(isBooked || isCheckedIn) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)' }}
                              disabled={actionLoading === apt._id}
                              onClick={() => {
                                const reason = window.prompt('Reason for cancellation (optional):');
                                if (reason !== null) {
                                  updateStatus(apt._id, 'cancelled', undefined, reason || 'Cancelled by staff');
                                }
                              }}
                            >
                              Cancel
                            </button>
                          )}

                          {(isCompleted || isCancelled) && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                              Finalized
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Completion Notes Modal */}
      {notesModal && (
        <div className="modal-backdrop" onClick={() => setNotesModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Complete Consultation</h3>
              <button
                onClick={() => setNotesModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
                Mark appointment #{notesModal.appointment.queueNumber} for{' '}
                <strong>{notesModal.appointment.userId?.name}</strong> as completed.
              </p>
              <div className="form-group">
                <label className="form-label">Service Notes / Outcome (optional)</label>
                <textarea
                  id="completionNotes"
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Advised on degree prerequisites, approved internship petition."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setNotesModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  const notes = document.getElementById('completionNotes')?.value;
                  updateStatus(notesModal.appointment._id, 'completed', notes);
                }}
              >
                Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
