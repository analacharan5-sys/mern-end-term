import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ServiceDirectoryPage from './pages/ServiceDirectoryPage';
import AvailableSlotsPage from './pages/AvailableSlotsPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import QueueStatusPage from './pages/QueueStatusPage';
import AdminServicesPage from './pages/AdminServicesPage';
import AdminSlotsPage from './pages/AdminSlotsPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import AdminStatsPage from './pages/AdminStatsPage';

function AppContent() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('services');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAppointmentForQueue, setSelectedAppointmentForQueue] = useState(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Loading QueueLess...</p>
        </div>
      </div>
    );
  }

  const handleSelectService = (service) => {
    setSelectedService(service);
    setCurrentTab('slots');
  };

  const handleBookingSuccess = (appointment) => {
    setSelectedAppointmentForQueue(appointment);
    setCurrentTab('my-appointments');
  };

  const handleSelectAppointmentForQueue = (appointment) => {
    setSelectedAppointmentForQueue(appointment);
    setCurrentTab('queue');
  };

  return (
    <div className="app-container">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="main-content">
        {/* Unauthenticated Pages */}
        {currentTab === 'login' && <LoginPage onNavigate={setCurrentTab} />}
        {currentTab === 'register' && <RegisterPage onNavigate={setCurrentTab} />}

        {/* Public / Student Accessible Pages */}
        {currentTab === 'services' && (
          <ServiceDirectoryPage onSelectService={handleSelectService} />
        )}

        {currentTab === 'slots' && (
          <AvailableSlotsPage
            initialService={selectedService}
            onBookingSuccess={handleBookingSuccess}
          />
        )}

        {currentTab === 'my-appointments' && (
          isAuthenticated ? (
            <MyAppointmentsPage onSelectAppointmentForQueue={handleSelectAppointmentForQueue} />
          ) : (
            <LoginPage onNavigate={setCurrentTab} />
          )
        )}

        {currentTab === 'queue' && (
          <QueueStatusPage targetAppointment={selectedAppointmentForQueue} />
        )}

        {/* Administrator Protected Pages */}
        {currentTab === 'admin-services' && (
          isAdmin ? <AdminServicesPage /> : <div className="alert alert-danger">Access restricted to Administrators.</div>
        )}

        {currentTab === 'admin-slots' && (
          isAdmin ? <AdminSlotsPage /> : <div className="alert alert-danger">Access restricted to Administrators.</div>
        )}

        {currentTab === 'admin-bookings' && (
          isAdmin ? <AdminBookingsPage /> : <div className="alert alert-danger">Access restricted to Administrators.</div>
        )}

        {currentTab === 'admin-stats' && (
          isAdmin ? <AdminStatsPage /> : <div className="alert alert-danger">Access restricted to Administrators.</div>
        )}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--gray-200)',
          background: '#ffffff',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--gray-500)'
        }}
      >
        <p>QueueLess &copy; {new Date().getFullYear()} Campus Appointment & Queue Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
