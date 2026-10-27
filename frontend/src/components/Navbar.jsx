import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Calendar,
  Layers,
  Users,
  BarChart3,
  LogOut,
  LogIn,
  UserPlus,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

export default function Navbar({ currentTab, setCurrentTab }) {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <a
          href="#home"
          className="nav-brand"
          onClick={(e) => {
            e.preventDefault();
            setCurrentTab('services');
          }}
        >
          <Clock size={24} />
          <span>QueueLess</span>
          <span className="nav-brand-sub">Campus</span>
        </a>

        {isAuthenticated && (
          <ul className="nav-links">
            <li>
              <button
                className={`nav-link btn-secondary ${currentTab === 'services' ? 'active' : ''}`}
                onClick={() => setCurrentTab('services')}
                style={{ border: 'none', background: currentTab === 'services' ? 'var(--primary-light)' : 'transparent' }}
              >
                <Layers size={16} /> Services
              </button>
            </li>
            <li>
              <button
                className={`nav-link btn-secondary ${currentTab === 'slots' ? 'active' : ''}`}
                onClick={() => setCurrentTab('slots')}
                style={{ border: 'none', background: currentTab === 'slots' ? 'var(--primary-light)' : 'transparent' }}
              >
                <Calendar size={16} /> Book Slot
              </button>
            </li>
            <li>
              <button
                className={`nav-link btn-secondary ${currentTab === 'my-appointments' ? 'active' : ''}`}
                onClick={() => setCurrentTab('my-appointments')}
                style={{ border: 'none', background: currentTab === 'my-appointments' ? 'var(--primary-light)' : 'transparent' }}
              >
                <Clock size={16} /> My Bookings
              </button>
            </li>
            <li>
              <button
                className={`nav-link btn-secondary ${currentTab === 'queue' ? 'active' : ''}`}
                onClick={() => setCurrentTab('queue')}
                style={{ border: 'none', background: currentTab === 'queue' ? 'var(--primary-light)' : 'transparent' }}
              >
                <Users size={16} /> Live Queue
              </button>
            </li>

            {/* Administrator Only Navigation Links */}
            {isAdmin && (
              <>
                <li style={{ borderLeft: '1px solid var(--gray-300)', marginLeft: '0.25rem', paddingLeft: '0.5rem' }}>
                  <button
                    className={`nav-link btn-secondary ${currentTab === 'admin-services' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('admin-services')}
                    style={{ border: 'none', background: currentTab === 'admin-services' ? 'var(--primary-light)' : 'transparent' }}
                  >
                    <ShieldAlert size={16} /> Services (Admin)
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link btn-secondary ${currentTab === 'admin-slots' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('admin-slots')}
                    style={{ border: 'none', background: currentTab === 'admin-slots' ? 'var(--primary-light)' : 'transparent' }}
                  >
                    <Calendar size={16} /> Slots (Admin)
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link btn-secondary ${currentTab === 'admin-bookings' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('admin-bookings')}
                    style={{ border: 'none', background: currentTab === 'admin-bookings' ? 'var(--primary-light)' : 'transparent' }}
                  >
                    <Users size={16} /> Desk Bookings
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link btn-secondary ${currentTab === 'admin-stats' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('admin-stats')}
                    style={{ border: 'none', background: currentTab === 'admin-stats' ? 'var(--primary-light)' : 'transparent' }}
                  >
                    <BarChart3 size={16} /> Stats & Utilization
                  </button>
                </li>
              </>
            )}
          </ul>
        )}

        <div className="nav-user-panel">
          {isAuthenticated ? (
            <>
              <div className="user-badge">
                <span className="user-name">{user.name}</span>
                <span className={`role-pill ${isAdmin ? 'role-admin' : 'role-student'}`}>
                  {isAdmin ? 'Administrator' : 'Student'}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={logout}
                title="Log out from QueueLess"
              >
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn btn-secondary btn-sm ${currentTab === 'login' ? 'active' : ''}`}
                onClick={() => setCurrentTab('login')}
              >
                <LogIn size={15} /> Log In
              </button>
              <button
                className={`btn btn-primary btn-sm ${currentTab === 'register' ? 'active' : ''}`}
                onClick={() => setCurrentTab('register')}
              >
                <UserPlus size={15} /> Register
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
