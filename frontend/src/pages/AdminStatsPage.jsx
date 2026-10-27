import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BarChart3, TrendingUp, CheckCircle, XCircle, Users, Calendar, Filter } from 'lucide-react';

export default function AdminStatsPage() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      const res = await api.get(`/api/admin/stats?${query.toString()}`);
      if (res.success) {
        setStatsData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate campus analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [startDate, endDate]);

  const summary = statsData?.summary;
  const breakdown = statsData?.serviceBreakdown || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointment Analytics & Utilization</h1>
          <p className="page-subtitle">
            Persisted metrics on slot capacity, campus department utilization, and fulfillment rates
          </p>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--gray-700)' }}>
            <Filter size={18} /> Date Range Filter:
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', marginBottom: '0.2rem' }}>From Date</label>
              <input
                type="date"
                className="form-input"
                style={{ padding: '0.4rem 0.65rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', marginBottom: '0.2rem' }}>To Date</label>
              <input
                type="date"
                className="form-input"
                style={{ padding: '0.4rem 0.65rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div style={{ alignSelf: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--gray-500)' }}>Computing analytics from persisted database records...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : !summary || summary.totalSlots === 0 ? (
        <div className="empty-state">
          <BarChart3 className="empty-state-icon" />
          <h3 className="empty-state-title">No appointment data found</h3>
          <p className="empty-state-text">
            No availability slots or appointments were recorded for the selected date range. Try clearing or expanding your date filters.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid-4" style={{ marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)' }}>
                  Capacity Utilization
                </span>
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                {summary.utilizationRate}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {summary.totalBookedSeats} of {summary.totalCapacity} total seats filled
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)' }}>
                  Total Bookings
                </span>
                <Users size={18} style={{ color: 'var(--info-text)' }} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                {summary.totalAppointments}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                Across {summary.totalSlots} published slots
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)' }}>
                  Completion Rate
                </span>
                <CheckCircle size={18} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)' }}>
                {summary.completionRate}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {summary.statusCounts.completed} completed sessions
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)' }}>
                  Cancellation Rate
                </span>
                <XCircle size={18} style={{ color: 'var(--danger)' }} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--danger)' }}>
                {summary.cancellationRate}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {summary.statusCounts.cancelled} spots released
              </div>
            </div>
          </div>

          {/* Breakdown Table by Campus Service */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
              Service Department Performance Breakdown
            </h3>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campus Department</th>
                    <th>Category</th>
                    <th>Slots</th>
                    <th>Capacity</th>
                    <th>Bookings</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((svc) => (
                    <tr key={svc.serviceId}>
                      <td>
                        <strong style={{ color: 'var(--gray-900)' }}>{svc.name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-booked">{svc.category}</span>
                      </td>
                      <td>{svc.totalSlots}</td>
                      <td>{svc.totalCapacity}</td>
                      <td>{svc.totalAppointments}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{svc.completed}</td>
                      <td style={{ color: 'var(--danger)' }}>{svc.cancelled}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, minWidth: '40px' }}>{svc.utilizationRate}%</span>
                          <div style={{ width: '80px', height: '6px', background: 'var(--gray-200)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${svc.utilizationRate}%`,
                                height: '100%',
                                background: svc.utilizationRate > 80 ? 'var(--warning)' : 'var(--primary)'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
