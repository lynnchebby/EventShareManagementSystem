import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function SystemAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('applications'); // 'applications', 'events', or 'users'

  useEffect(() => {
    verifyAdminAndFetchData();
  }, []);

  const verifyAdminAndFetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setCurrentUserEmail(session.user.email);

      // Verify admin clearance
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileErr || profile?.role !== 'admin') {
        alert("System Access Denied: Administrator clearance required.");
        navigate('/');
        return;
      }

      // Fetch all system events
      const { data: allEvents, error: eventsErr } = await supabase
        .from('events')
        .select(`*, photos(id)`)
        .order('event_date', { ascending: false });
      if (eventsErr) throw eventsErr;
      setEvents(allEvents || []);

      // Fetch all profiles
      const { data: allProfiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*');
      if (profilesErr) throw profilesErr;
      setProfiles(allProfiles || []);

    } catch (err) {
      console.error("Admin Telemetry Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'organiser', application_status: 'approved' })
        .eq('id', userId);

      if (error) throw error;
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: 'organiser', application_status: 'approved' } : p));
      alert("System Notice: Application approved. User promoted to Organiser.");
    } catch (err) {
      alert(`Approval Failure: ${err.message}`);
    }
  };

  const handleRejectApplication = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ application_status: 'rejected' })
        .eq('id', userId);

      if (error) throw error;
      setProfiles(profiles.map(p => p.id === userId ? { ...p, application_status: 'rejected' } : p));
      alert("System Notice: Application rejected.");
    } catch (err) {
      alert(`Rejection Failure: ${err.message}`);
    }
  };

  const handleGlobalDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`GLOBAL SECURITY WARNING: Confirm permanent deletion of event archive "${eventTitle}"?`)) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      setEvents(events.filter(e => e.id !== eventId));
      alert("System Notice: Event record deleted globally.");
    } catch (err) {
      alert(`Delete Failure: ${err.message}`);
    }
  };

  // NEW: Suspend User Logic
  const handleSuspendUser = async (userId) => {
    if (!window.confirm(`SECURITY WARNING: Confirm suspension of this user profile? They will be locked out of the system.`)) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'suspended' })
        .eq('id', userId);

      if (error) throw error;
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: 'suspended' } : p));
      alert("System Notice: User access suspended.");
    } catch (err) {
      alert(`Suspension Failure: ${err.message}`);
    }
  };

  // NEW: Restore User Logic
  // NEW: Smart Restore User Logic
  const handleRestoreUser = async (userId) => {
    try {
      // Find the user in our current list to check their past credentials
      const userToRestore = profiles.find(p => p.id === userId);
      
      // If their application was approved in the past, they get organiser back. Otherwise, attendee.
      const correctRole = userToRestore?.application_status === 'approved' ? 'organiser' : 'attendee';

      const { error } = await supabase
        .from('profiles')
        .update({ role: correctRole })
        .eq('id', userId);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: correctRole } : p));
      alert(`System Notice: User access successfully restored to ${correctRole} status.`);
    } catch (err) {
      alert(`Restore Failure: ${err.message}`);
    }
  };
  const pendingApplications = profiles.filter(p => p.application_status === 'pending');

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#4c1d95' }}>
        <span style={{ fontSize: '15px', fontWeight: '600' }}>Authenticating Master Clearance...</span>
      </div>
    );
  }

  // Top Horizontal Tab Button
  const TopTabButton = ({ id, label, badgeCount }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
          background: isActive ? '#4c1d95' : '#f8fafc',
          color: isActive ? '#ffffff' : '#475569',
          border: isActive ? '1px solid #4c1d95' : '1px solid #e2e8f0',
          borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
          fontWeight: '700', fontSize: '14px'
        }}
      >
        {label}
        {badgeCount > 0 && (
          <span style={{ background: isActive ? '#f43f5e' : '#e2e8f0', color: isActive ? '#fff' : '#475569', padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* HEADER & TOP NAVIGATION */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: '11px', background: '#fef2f2', color: '#dc2626', padding: '4px 12px', borderRadius: '20px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #fee2e2', marginBottom: '8px' }}>
              Administrator Mode
            </span>
            <h2 style={{ fontSize: '28px', color: '#0f172a', margin: '0 0 4px 0', fontWeight: '800' }}>Command Center</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0', fontWeight: '500' }}>Logged in as: {currentUserEmail}</p>
          </div>
        </div>

        {/* Horizontal Tab Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <TopTabButton id="applications" label="Vetting Queue" badgeCount={pendingApplications.length} />
          <TopTabButton id="events" label="Global Events" badgeCount={events.length} />
          <TopTabButton id="users" label="System Profiles" badgeCount={profiles.length} />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div>
        {/* Tab 1: The Vetting Queue */}
        {activeTab === 'applications' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Organiser Application Vetting Queue</h3>
            </div>
            {pendingApplications.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Applicant Name</th>
                      <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Company / Brand</th>
                      <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Verification ID</th>
                      <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Justification</th>
                      <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApplications.map(app => (
                      <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{app.full_name || 'Anonymous'}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '600', color: '#4c1d95' }}>{app.company_name}</td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', color: '#475569' }}>{app.verification_id}</td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', maxWidth: '250px' }}>{app.application_reason}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleApproveApplication(app.id)} style={{ background: '#f0fdf4', color: '#10b981', border: '1px solid #dcfce3', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Approve</button>
                            <button onClick={() => handleRejectApplication(app.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <p style={{ color: '#64748b', margin: '0', fontSize: '15px', fontWeight: '500' }}>No pending applications in the vetting queue.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Global Events Ledger */}
        {activeTab === 'events' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Global Event Registry</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Event Title</th>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Organiser Email</th>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>City</th>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Protocol</th>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Assets</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{ev.title}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>{ev.email || 'System Default'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>{ev.location_city}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '11px', background: ev.is_private ? '#fff7ed' : '#f0fdf4', color: ev.is_private ? '#ea580c' : '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                          {ev.is_private ? 'Private' : 'Public'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: '#475569' }}>{ev.photos?.length || 0}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button onClick={() => handleGlobalDeleteEvent(ev.id, ev.title)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Delete Record</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: System Profiles Ledger */}
        {activeTab === 'users' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Registered User Profiles</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Full Name</th>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Role</th>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Application Status</th>
                    <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Node ID</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(profile => (
                    <tr key={profile.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{profile.full_name || 'Anonymous User'}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '11px', background: profile.role === 'admin' ? '#fef2f2' : profile.role === 'organiser' ? '#faf5ff' : '#f8fafc', color: profile.role === 'admin' ? '#dc2626' : profile.role === 'organiser' ? '#7c3aed' : '#475569', padding: '4px 10px', borderRadius: '12px', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #e2e8f0' }}>
                          {profile.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '600', color: '#475569', textTransform: 'capitalize' }}>
                        {profile.application_status || 'none'}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>{profile.id}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {/* Prevent admins from suspending other admins */}
                          {profile.role !== 'admin' && (
                            profile.role === 'suspended' ? (
                              <button onClick={() => handleRestoreUser(profile.id)} style={{ background: '#f0fdf4', color: '#10b981', border: '1px solid #dcfce3', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Restore Access</button>
                            ) : (
                              <button onClick={() => handleSuspendUser(profile.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Suspend User</button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}