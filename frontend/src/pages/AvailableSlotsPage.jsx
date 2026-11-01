import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Calendar, Clock, Users, CheckCircle, AlertCircle, BookmarkPlus, Sparkles } from 'lucide-react';
import BookingModal from './BookingModal';

function getLocalDateStr(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AvailableSlotsPage({ initialService, onBookingSuccess }) {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(initialService?._id || '');
  const [date, setDate] = useState(getLocalDateStr(0));
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [slots, setSlots] = useState([]);
  const [serviceDetails, setServiceDetails] = useState(initialService || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick select date buttons
  const quickDates = [
    { label: 'Today', dateStr: getLocalDateStr(0) },
    { label: 'Tomorrow', dateStr: getLocalDateStr(1) },
    {
      label: new Date(Date.now() + 2 * 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      dateStr: getLocalDateStr(2)
    },
    {
      label: new Date(Date.now() + 3 * 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      dateStr: getLocalDateStr(3)
    },
    {
      label: new Date(Date.now() + 4 * 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      dateStr: getLocalDateStr(4)
    },
    {
      label: new Date(Date.now() + 5 * 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      dateStr: getLocalDateStr(5)
    },
    {
      label: new Date(Date.now() + 6 * 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      dateStr: getLocalDateStr(6)
    }
  ];

  // Booking Modal State
  const [bookingSlot, setBookingSlot] = useState(null);

  // Load all services for the dropdown
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.get('/api/services');
        if (res.success && res.services.length > 0) {
          setServices(res.services);
          if (!selectedServiceId) {
            setSelectedServiceId(res.services[0]._id);
            setServiceDetails(res.services[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    }
    loadServices();
  }, []);

  // Update serviceDetails when selectedServiceId changes
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const match = services.find((s) => s._id === selectedServiceId);
      if (match) setServiceDetails(match);
    }
  }, [selectedServiceId, services]);

  // Load slots whenever serviceId, date, or onlyAvailable changes
  useEffect(() => {
    if (!selectedServiceId) return;

    async function loadSlots() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          serviceId: selectedServiceId,
          date,
          onlyAvailable: onlyAvailable ? 'true' : 'false'
        });
        const res = await api.get(`/api/slots?${query.toString()}`);
        if (res.success) {
          setSlots(res.slots);
          if (res.service) {
            setServiceDetails((prev) => ({ ...prev, ...res.service }));
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load availability slots.');
        setSlots([]);
      } finally {
        setLoading(false);
      }
    }

    loadSlots();
  }, [selectedServiceId, date, onlyAvailable]);

  const handleBookingCompleted = (appointmentData) => {
    setBookingSlot(null);
    // Refresh slots
    if (selectedServiceId) {
      api.get(`/api/slots?serviceId=${selectedServiceId}&date=${date}`).then((res) => {
        if (res.success) setSlots(res.slots);
      });
    }
    if (onBookingSuccess) {
      onBookingSuccess(appointmentData);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Available Time Slots</h1>
          <p className="page-subtitle">
            Select a campus department and date to reserve your appointment
          </p>
        </div>
      </div>

      {/* Filter and selection card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="grid-3" style={{ gap: '1.25rem', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Campus Service</label>
            <select
              className="form-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              {services.map((svc) => (
                <option key={svc._id} value={svc._id}>
                  {svc.name} ({svc.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--gray-700)',
                cursor: 'pointer',
                paddingBottom: '0.6rem'
              }}
            >
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Hide fully booked slots
            </label>
          </div>
        </div>

        {/* Quick Date Pills */}
        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginRight: '0.25rem' }}>
            Quick Dates:
          </span>
          {quickDates.map((qd) => (
            <button
              key={qd.dateStr}
              type="button"
              className={`btn btn-sm ${date === qd.dateStr ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
              onClick={() => setDate(qd.dateStr)}
            >
              {qd.label}
            </button>
          ))}
        </div>

        {serviceDetails && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--gray-200)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--gray-600)'
            }}
          >
            <span><strong>Department:</strong> {serviceDetails.name}</span>
            <span><strong>Location:</strong> {serviceDetails.location}</span>
            <span><strong>Duration:</strong> {serviceDetails.durationMinutes} mins</span>
            <span>
              <strong>Status:</strong>{' '}
              <span className={`badge ${serviceDetails.isActive ? 'badge-active' : 'badge-inactive'}`}>
                {serviceDetails.isActive ? 'Active' : 'Inactive'}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Slots Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--gray-500)' }}>Finding available slots...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : slots.length === 0 ? (
        <div className="empty-state">
          <Calendar className="empty-state-icon" />
          <h3 className="empty-state-title">No slots available for {date}</h3>
          <p className="empty-state-text">
            {date < getLocalDateStr(0)
              ? `The selected date (${date}) is in the past. Campus service appointments are only available for today and upcoming dates.`
              : `There are currently no slots published for this service on ${date}. Select an upcoming date or jump to today below.`}
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setDate(getLocalDateStr(0))}
            >
              Jump to Today
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDate(getLocalDateStr(1))}
            >
              Check Tomorrow
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {slots.map((slot) => {
            const isFull = slot.isFull || slot.bookedCount >= slot.capacity;
            const availableSeats = Math.max(0, slot.capacity - slot.bookedCount);
            const utilizationPercent = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));

            return (
              <div
                key={slot.id || slot._id}
                className="card"
                style={{
                  borderLeft: isFull ? '4px solid var(--danger)' : '4px solid var(--success)',
                  opacity: isFull ? 0.85 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>
                    <Clock size={18} style={{ color: isFull ? 'var(--danger)' : 'var(--primary)' }} />
                    <span>{slot.startTime} – {slot.endTime}</span>
                  </div>
                  <span className={`capacity-pill ${isFull ? 'capacity-full' : 'capacity-available'}`}>
                    {isFull ? 'FULL' : `${availableSeats} open`}
                  </span>
                </div>

                {/* Progress bar of slot capacity */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.3rem' }}>
                    <span>Capacity: {slot.bookedCount} / {slot.capacity} reserved</span>
                    <span>{utilizationPercent}% filled</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--gray-200)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${utilizationPercent}%`,
                        height: '100%',
                        background: isFull ? 'var(--danger)' : 'var(--primary)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                <button
                  className={`btn ${isFull ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ width: '100%' }}
                  disabled={isFull || !slot.isAvailable}
                  onClick={() => setBookingSlot({ ...slot, serviceName: serviceDetails?.name, serviceLocation: serviceDetails?.location })}
                >
                  {isFull ? 'Slot Full' : <><BookmarkPlus size={16} /> Reserve Spot</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Confirmation / Form Modal */}
      {bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          service={serviceDetails}
          onClose={() => setBookingSlot(null)}
          onSuccess={handleBookingCompleted}
        />
      )}
    </div>
  );
}
