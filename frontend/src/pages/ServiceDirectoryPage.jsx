import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Layers, Clock, Users, MapPin, Search, Calendar, ChevronRight } from 'lucide-react';

export default function ServiceDirectoryPage({ onSelectService }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'All',
    'Academic Advising',
    'Financial Aid',
    'Campus Health',
    'Registrar & Records',
    'Career Services'
  ];

  useEffect(() => {
    async function loadServices() {
      setLoading(true);
      try {
        const res = await api.get('/api/services');
        if (res.success) {
          setServices(res.services);
        }
      } catch (err) {
        setError(err.message || 'Failed to load campus services.');
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  const filteredServices = services.filter((svc) => {
    const matchesCategory = selectedCategory === 'All' || svc.category === selectedCategory;
    const matchesSearch =
      svc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Services Directory</h1>
          <p className="page-subtitle">
            Browse available campus departments and book an appointment slot
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--gray-500)' }}>Loading active campus services...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : filteredServices.length === 0 ? (
        <div className="empty-state">
          <Layers className="empty-state-icon" />
          <h3 className="empty-state-title">No services found</h3>
          <p className="empty-state-text">
            No campus services match the current category filter or search query.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {filteredServices.map((svc) => (
            <div key={svc._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className="badge badge-booked" style={{ fontSize: '0.75rem' }}>
                  {svc.category}
                </span>
                <span className={`badge ${svc.isActive ? 'badge-active' : 'badge-inactive'}`}>
                  {svc.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                {svc.name}
              </h3>

              <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1.25rem', flex: 1 }}>
                {svc.description}
              </p>

              <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--gray-600)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={15} style={{ color: 'var(--primary)' }} />
                  <span>Duration: <strong>{svc.durationMinutes} mins</strong> (buffer {svc.bufferMinutes || 5} mins)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={15} style={{ color: 'var(--primary)' }} />
                  <span>Max Capacity: <strong>{svc.defaultCapacity} students / slot</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} style={{ color: 'var(--primary)' }} />
                  <span>{svc.location}</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => onSelectService(svc)}
                style={{ width: '100%' }}
              >
                <Calendar size={16} /> View Available Slots
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
