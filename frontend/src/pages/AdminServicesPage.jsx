import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Layers, Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Academic Advising',
    durationMinutes: 30,
    defaultCapacity: 3,
    bufferMinutes: 5,
    location: '',
    contactEmail: '',
    isActive: true
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const loadServices = async () => {
    setLoading(true);
    try {
      // includeInactive=true for admins
      const res = await api.get('/api/services?includeInactive=true');
      if (res.success) {
        setServices(res.services);
      }
    } catch (err) {
      setError(err.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      category: 'Academic Advising',
      durationMinutes: 30,
      defaultCapacity: 3,
      bufferMinutes: 5,
      location: 'Campus Center, Room 101',
      contactEmail: '',
      isActive: true
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (svc) => {
    setEditingService(svc);
    setFormData({
      name: svc.name,
      description: svc.description,
      category: svc.category,
      durationMinutes: svc.durationMinutes,
      defaultCapacity: svc.defaultCapacity,
      bufferMinutes: svc.bufferMinutes || 5,
      location: svc.location || '',
      contactEmail: svc.contactEmail || '',
      isActive: svc.isActive
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (editingService) {
        await api.put(`/api/services/${editingService._id}`, formData);
      } else {
        await api.post('/api/services', formData);
      }
      setModalOpen(false);
      loadServices();
    } catch (err) {
      setFormError(err.message || 'Failed to save service.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate '${name}'?`)) return;
    try {
      const res = await api.delete(`/api/services/${id}`);
      alert(res.message || 'Service deleted or deactivated successfully.');
      loadServices();
    } catch (err) {
      alert(err.message || 'Failed to delete service.');
    }
  };

  const toggleActive = async (svc) => {
    try {
      await api.put(`/api/services/${svc._id}`, { isActive: !svc.isActive });
      loadServices();
    } catch (err) {
      alert(err.message || 'Failed to update service status');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Service Management</h1>
          <p className="page-subtitle">
            Configure campus departments, durations, and booking capacity rules
          </p>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> Add New Service
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--gray-500)' }}>Loading campus services...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Category</th>
                <th>Duration</th>
                <th>Default Capacity</th>
                <th>Location</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc._id}>
                  <td>
                    <strong style={{ color: 'var(--gray-900)' }}>{svc.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {svc.description}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-booked">{svc.category}</span>
                  </td>
                  <td>{svc.durationMinutes} mins</td>
                  <td>{svc.defaultCapacity} students / slot</td>
                  <td>{svc.location}</td>
                  <td>
                    <button
                      className={`badge ${svc.isActive ? 'badge-active' : 'badge-inactive'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => toggleActive(svc)}
                      title="Click to toggle active state"
                    >
                      {svc.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(svc)}
                        title="Edit service details"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(svc._id, svc.name)}
                        title="Delete or deactivate service"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingService ? 'Edit Campus Service' : 'Add New Campus Service'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Service Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Academic Advising">Academic Advising</option>
                      <option value="Financial Aid">Financial Aid</option>
                      <option value="Campus Health">Campus Health</option>
                      <option value="Registrar & Records">Registrar & Records</option>
                      <option value="Career Services">Career Services</option>
                      <option value="Student Life">Student Life</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duration (minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      min={5}
                      max={240}
                      required
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Default Capacity (per slot)</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={50}
                      required
                      value={formData.defaultCapacity}
                      onChange={(e) => setFormData({ ...formData, defaultCapacity: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Buffer Between Slots (minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      max={60}
                      value={formData.bufferMinutes}
                      onChange={(e) => setFormData({ ...formData, bufferMinutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location / Room Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Active (Available for student bookings)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <div className="spinner" /> : editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
