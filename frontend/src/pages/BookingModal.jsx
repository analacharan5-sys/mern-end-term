import React, { useState } from 'react';
import { api } from '../api/client';
import { Clock, Calendar, MapPin, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';

export default function BookingModal({ slot, service, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmationData, setConfirmationData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await api.post('/api/appointments', {
        slotId: slot.id || slot._id,
        reason: reason.trim()
      });

      if (res.success && res.appointment) {
        setConfirmationData({
          appointment: res.appointment,
          queue: res.queue
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete appointment reservation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {confirmationData ? 'Booking Confirmation' : 'Confirm Appointment Reservation'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {confirmationData ? (
            /* Confirmation View */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--success-bg)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem'
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                You're Scheduled!
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                Your appointment has been reserved and your place in line is confirmed.
              </p>

              {/* Queue ticket summary */}
              <div
                style={{
                  background: 'var(--primary-light)',
                  border: '1px solid var(--primary-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>
                    Queue Ticket
                  </div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
                    #{confirmationData.appointment.queueNumber}
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid var(--primary-border)', paddingLeft: '1.5rem', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                    <strong>Service:</strong> {confirmationData.appointment.serviceId?.name || service?.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                    <strong>Date:</strong> {slot.date}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                    <strong>Time:</strong> {slot.startTime} – {slot.endTime}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  onSuccess(confirmationData.appointment);
                }}
              >
                Go to My Appointments <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit}>
              {errorMsg && (
                <div className="alert alert-danger">
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Slot Summary Card */}
              <div
                style={{
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>
                  {service?.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-600)' }}>
                  <Calendar size={15} style={{ color: 'var(--primary)' }} />
                  <span>{slot.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-600)' }}>
                  <Clock size={15} style={{ color: 'var(--primary)' }} />
                  <span>{slot.startTime} – {slot.endTime} ({service?.durationMinutes || 30} mins)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-600)' }}>
                  <MapPin size={15} style={{ color: 'var(--primary)' }} />
                  <span>{service?.location}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Reason for Visit / Questions for Staff <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional)</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Need to review graduation audit and sign prerequisite waiver form."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                />
                <div className="form-helper">Maximum 500 characters</div>
              </div>

              <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <div className="spinner" /> : 'Confirm Booking'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
