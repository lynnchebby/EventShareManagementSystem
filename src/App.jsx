import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import HomeDiscover from './views/HomeDiscover';
import EventGallery from './views/EventGallery';
import OrganiserDashboard from './views/OrganiserDashboard';
import LoginAuth from './views/LoginAuth';
import SavedArchives from './views/SavedArchives';
import PerformanceAnalytics from './views/PerformanceAnalytics';
import AccountSettings from './views/AccountSettings';
import SystemAdminDashboard from './views/SystemAdminDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let activeUserId = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        activeUserId = session.user.id;
        fetchUserProfileRole(session.user.id);
      } else {
        setCheckingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        if (session.user.id !== activeUserId) {
          activeUserId = session.user.id;
          fetchUserProfileRole(session.user.id);
        }
      } else {
        activeUserId = null;
        setUserRole(null);
        setCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfileRole = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (error) throw error;
      setUserRole(data?.role || 'attendee');
    } catch (err) {
      setUserRole('attendee');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSystemLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      window.location.href = "/login";
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', color: '#4c1d95' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }}>
          <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '0.5px' }}>Authenticating Secure Link...</span>
      </div>
    );
  }

  // Define a style function for NavLinks to dynamically apply colors based on active state
  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px', 
    textDecoration: 'none', 
    fontWeight: '600', 
    fontSize: '14px', 
    transition: 'color 0.2s',
    color: isActive ? '#4c1d95' : '#475569',
  });

  return (
    <Router>
      <div style={{ 
        minHeight: '100vh', 
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        background: '#f8fafc',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(76, 29, 149, 0.08) 0%, rgba(248, 250, 252, 0) 50%)',
        position: 'relative'
      }}>
        
        {/* Injecting CSS to handle the hover effects on the navigation links */}
        <style>
          {`
            .nav-item:hover { color: #4c1d95 !important; }
            .nav-item:hover svg { stroke: #4c1d95 !important; }
            .signout-btn:hover { color: #ef4444 !important; }
            .signout-btn:hover svg { stroke: #ef4444 !important; }
          `}
        </style>

        {/* Full-Width, Sticky Glassmorphism Navigation Bar */}
        {session && (
          <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}>
            <nav style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.85)', 
              backdropFilter: 'blur(16px)', 
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(226, 232, 240, 0.8)', 
              padding: '16px 40px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.03)'
            }}>
              
              {/* Brand Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(76, 29, 149, 0.2)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/><line x1="7.38" y1="12" x2="13.12" y2="2.06"/><line x1="9.69" y1="16" x2="3.95" y2="6.06"/><line x1="14.31" y1="16" x2="2.83" y2="16"/><line x1="16.62" y1="12" x2="10.88" y2="21.94"/>
                  </svg>
                </div>
                <Link to="/" style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', textDecoration: 'none', letterSpacing: '-0.3px' }}>
                  EventShare <span style={{ color: '#4c1d95', fontWeight: '700' }}>Pro</span>
                </Link>
              </div>
              
              {/* Navigation Links & User Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                
                {/* Profile Identity Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#f8fafc', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: userRole === 'organiser' ? '#7c3aed' : '#10b981' }}></div>
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                    <span style={{ color: '#0f172a', textTransform: 'capitalize' }}>{userRole}</span> &nbsp;|&nbsp; {session.user.email}
                  </span>
                </div>
                
                <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>
                
                {/* Global Link: Discovery Feed */}
                <NavLink to="/" end className="nav-item" style={navLinkStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  Discovery
                </NavLink>

                {/* ATTENDEE EXCLUSIVE ROUTING */}
                {userRole !== 'organiser' && (
                  <NavLink to="/saved" className="nav-item" style={navLinkStyle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    Archives
                  </NavLink>
                )}

                {/* ORGANISER EXCLUSIVE ROUTING */}
                {userRole === 'organiser' && (
                  <>
                    <NavLink to="/reports" className="nav-item" style={navLinkStyle}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                      Analytics
                    </NavLink>
                    
                    {/* Note: Kept as standard Link to preserve the solid button styling, but updated the color logic if active */}
                    <NavLink to="/organiser" style={({ isActive }) => ({ 
                      display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '13px', 
                      background: isActive ? '#3b0764' : '#4c1d95', 
                      color: '#ffffff', padding: '8px 16px', borderRadius: '8px', 
                      boxShadow: isActive ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : '0 2px 8px rgba(76, 29, 149, 0.25)',
                      transition: 'all 0.2s'
                    })}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                      Workspace
                    </NavLink>
                  </>
                )}

                {/* Global Link: Settings */}
                <NavLink to="/settings" className="nav-item" style={navLinkStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Settings
                </NavLink>
                
                <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>

                {/* System Disconnect */}
                <button
                  onClick={handleSystemLogout}
                  className="signout-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: '8px', transition: 'color 0.2s' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Global Structural Routes Engine */}
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px 80px 24px' }}>
         <Routes>
  <Route path="/login" element={!session ? <LoginAuth /> : <Navigate to="/" />} />
  
  {/* Authenticated Application Routes */}
  <Route path="/" element={session ? <HomeDiscover /> : <Navigate to="/login" />} />
  <Route path="/event/:id" element={session ? <EventGallery /> : <Navigate to="/login" />} />
  
  {/* Organiser Exclusive Routes */}
  <Route path="/organiser" element={session ? (userRole === 'organiser' ? <OrganiserDashboard /> : <Navigate to="/" />) : <Navigate to="/login" />} />
  <Route path="/reports" element={session ? (userRole === 'organiser' ? <PerformanceAnalytics /> : <Navigate to="/" />) : <Navigate to="/login" />} />

  {/* NEW: Admin Exclusive Routes */}
  <Route path="/admin" element={session ? (userRole === 'admin' ? <SystemAdminDashboard /> : <Navigate to="/" />) : <Navigate to="/login" />} />

  {/* Attendee / Global Routes */}
  <Route path="/saved" element={session ? <SavedArchives /> : <Navigate to="/login" />} />
  <Route path="/settings" element={session ? <AccountSettings /> : <Navigate to="/login" />} />
  
</Routes>
        </main>
      </div>
    </Router>
  );
}