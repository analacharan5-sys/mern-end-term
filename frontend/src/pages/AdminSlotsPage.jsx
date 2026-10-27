import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Calendar, Plus, Trash2, Clock, Users, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AdminSlotsPage() {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Bulk Generator Form State
  const [genData, setGenData] = useState({
    dayStartTime: '09:00',
    dayEndTime: '17:00',
    slotDurationMinutes: 30,
    capacity: 3
  });
  const [generating, setGenerating] = useState(false);

  // Single Slot Form State
  const [singleStart, setSingleStart] = useState('10:00');
  const [singleEnd, setSingleEnd] = useState('10:30');
  const [singleCapacity, setSingleCapacity] = useState(3);
  const [singleCreating, setSingleCreating] = useState(false);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.get('/api/services?includeInactive=true');
        if (res.success && res.services.length > 0) {
          setServices(res.services);
          setSelectedServiceId(res.services[0]._id);
          setGenData((prev) => ({
            ...prev,
            slotDurationMinutes: res.services[0].durationMinutes || 30,
            capacity: res.services[0].defaultCapacity || 3
          }));
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    }
    loadServices();
  }, []);

  const loadSlots = async () => {
    if (!selectedServiceId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/slots?serviceId=${selectedServiceId}&date=${date}`);
      if (res.success) {
        setSlots(res.slots);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [selectedServiceId, date]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setMessage('');
    try {
      const res = await api.post('/api/slots/generate', {
        serviceId: selectedServiceId,
        date,
        ...genData
      });
      if (res.success) {
        setMessage(res.message);
        loadSlots();
      }
    } catch (err) {
      alert(err.message || 'Slot generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateSingle = async (e) => {
    e.preventDefault();
    setSingleCreating(true);
    setMessage('');
    try {
      const res = await api.post('/api/slots', {
        serviceId: selectedServiceId,
        date,
        startTime: singleStart,
        endTime: singleEnd,
        capacity: Number(singleCapacity)
      });
      if (res.success) {
        setMessage('Single slot created successfully!');
        loadSlots();
      }
    } catch (err) {
      alert(err.message || 'Slot creation failed.');
    } finally {
      setSingleCreating(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) return;
    try {
      const res = await api.delete(`/api/slots/${slotId}`);
      if (res.success) {
        loadSlots();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete slot.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Availability Slot Management</h1>
          <p className="page-subtitle">
            Publish time slots, bulk generate schedules, and monitor slot capacity
          </p>
        </div>
      </div>

      {message && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* Target Service & Date Selector */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div className="grid-2" style={{ gap: '1rem' }}>
          <div>
            <label className="form-label">Select Service</label>
            <select
              className="form-select"
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                const svc = services.find((s) => s._id === e.target.value);
                if (svc) {
                  setGenData((prev) => ({
                    ...prev,
                    slotDurationMinutes: svc.durationMinutes || 30,
                    capacity: svc.defaultCapacity || 3
                  }));
                }
              }}
            >
              {services.map((svc) => (
                <option key={svc._id} value={svc._id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Select Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Generator Tools */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Bulk Slot Generator */}
        <div className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} /> Bulk Slot Generator
          </h3>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Generate recurring consecutive slots across a working day window
          </p>

          <form onSubmit={handleGenerate}>
            <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label">Day Start (HH:mm)</label>
                <input
                  type="time"
                  className="form-input"
                  required
                  value={genData.dayStartTime}
                  onChange={(e) => setGenData({ ...genData, dayStartTime: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Day End (HH:mm)</label>
                <input
                  type="time"
                  className="form-input"
                  required
                  value={genData.dayEndTime}
                  onChange={(e) => setGenData({ ...genData, dayEndTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="form-label">Duration (mins)</label>
                <input
                  type="number"
                  className="form-input"
                  min={5}
                  max={240}
                  required
                  value={genData.slotDurationMinutes}
                  onChange={(e) => setGenData({ ...genData, slotDurationMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="form-label">Capacity (seats)</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={50}
                  required
                  value={genData.capacity}
                  onChange={(e) => setGenData({ ...genData, capacity: Number(e.target.value) })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={generating}>
              {generating ? <div className="spinner" /> : <><Sparkles size={15} /> Generate Consecutive Slots</>}
            </button>
          </form>
        </div>

        {/* Single Slot Creator */}
        <div className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} style={{ color: 'var(--primary)' }} /> Add Custom Single Slot
          </h3>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Create an individual time slot with custom interval
          </p>

          <form onSubmit={handleCreateSingle}>
            <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label">Start Time (HH:mm)</label>
                <input
                  type="time"
                  className="form-input"
                  required
                  value={singleStart}
                  onChange={(e) => setSingleStart(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">End Time (HH:mm)</label>
                <input
                  type="time"
                  className="form-input"
                  required
                  value={singleEnd}
                  onChange={(e) => setSingleEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Capacity (Max Students)</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={50}
                required
                value={singleCapacity}
                onChange={(e) => setSingleCapacity(Number(e.target.value))}
              />
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={singleCreating}>
              {singleCreating ? <div className="spinner" /> : <><Plus size={15} /> Add Single Slot</>}
            </button>
          </form>
        </div>
      </div>

      {/* Published Slots Table */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>
          Published Slots for {date} ({slots.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--gray-500)' }}>Loading slots...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="empty-state" style={{ border: 'none' }}>
            <Calendar className="empty-state-icon" />
            <h4 className="empty-state-title">No slots published for this date</h4>
            <p className="empty-state-text">Use the generator above to create slots for students to book.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Time Interval</th>
                  <th>Capacity</th>
                  <th>Reserved Seats</th>
                  <th>Available</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id || s._id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>
                        {s.startTime} – {s.endTime}
                      </strong>
                    </td>
                    <td>{s.capacity} students</td>
                    <td>{s.bookedCount} booked</td>
                    <td>{s.availableSeats} open</td>
                    <td>
                      <span className={`capacity-pill ${s.isFull ? 'capacity-full' : 'capacity-available'}`}>
                        {s.isFull ? 'Full' : 'Open'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        disabled={s.bookedCount > 0}
                        title={s.bookedCount > 0 ? 'Cannot delete slot with active bookings' : 'Delete slot'}
                        onClick={() => handleDeleteSlot(s.id || s._id)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
