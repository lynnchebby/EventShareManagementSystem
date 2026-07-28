import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function PerformanceAnalytics() {
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [organiserName, setOrganiserName] = useState('');
  
  // Aggregate Metrics State
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [privateEventsCount, setPrivateEventsCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState([]);

  // Arbitrary global storage limit for visual representation (e.g., 500 assets max per account)
  const GLOBAL_ASSET_LIMIT = 500;

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // 1. Authenticate and get user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session.");
      
      const email = session.user.email;
      setCurrentUserEmail(email);

      // Extract a display name from email for querying if needed, 
      // but ideally we check where email matches the event email.
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, 
          title, 
          event_date, 
          is_private, 
          photos (id)
        `)
        .eq('email', email)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      const events = eventsData || [];
      
      // 2. Calculate Aggregates
      let photoCount = 0;
      let privateCount = 0;

      events.forEach(ev => {
        photoCount += ev.photos ? ev.photos.length : 0;
        if (ev.is_private) privateCount += 1;
      });

      setTotalEvents(events.length);
      setTotalPhotos(photoCount);
      setPrivateEventsCount(privateCount);
      
      // Take the top 5 most recent for the breakdown table
      setRecentEvents(events.slice(0, 5));

    } catch (err) {
      console.error("Analytics Sync Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayName = currentUserEmail 
    ? currentUserEmail.split('@')[0].split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Organiser';

  const storagePercentage = Math.min((totalPhotos / GLOBAL_ASSET_LIMIT) * 100, 100).toFixed(1);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#4c1d95' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span style={{ fontSize: '15px', fontWeight: '600' }}>Aggregating Telemetry Data...</span>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', color: '#0f172a', margin: '0 0 8px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
          Network Analytics
        </h2>
        <p style={{ color: '#64748b', fontSize: '16px', margin: '0', fontWeight: '500' }}>
          Live network and system monitoring for {displayName}.
        </p>
      </div>

      {/* Top Level Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            </div>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Deployments</span>
          </div>
          <div style={{ fontSize: '40px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{totalEvents}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Media Assets</span>
          </div>
          <div style={{ fontSize: '40px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{totalPhotos}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#fff7ed', padding: '10px', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secured Vaults</span>
          </div>
          <div style={{ fontSize: '40px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{privateEventsCount}</div>
        </div>
        
      </div>

      {/* Infrastructure Usage Progress Bar */}
      <div style={{ background: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Global Storage Usage</h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Overall account capacity across all event sub-directories.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#4c1d95' }}>{storagePercentage}%</span>
            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Used</span>
          </div>
        </div>
        
        <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${storagePercentage}%`, height: '100%', background: 'linear-gradient(90deg, #4c1d95, #7c3aed)', transition: 'width 1s ease-in-out' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
          <span>0 Assets</span>
          <span>{totalPhotos} / {GLOBAL_ASSET_LIMIT} Assets</span>
        </div>
      </div>

      {/* Recent Deployments Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Recently Deployed Events</h3>
        </div>
        
        {recentEvents.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event Name</th>
                  <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timestamp</th>
                  <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Access</th>
                  <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Media Assets</th>
                  <th style={{ padding: '16px 24px' }}></th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px', color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>{ev.title}</td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px', fontWeight: '500' }}>{ev.event_date}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontSize: '11px', background: ev.is_private ? '#fff7ed' : '#f0fdf4', color: ev.is_private ? '#ea580c' : '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                        {ev.is_private ? 'Private' : 'Public'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px', fontWeight: '700' }}>{ev.photos ? ev.photos.length : 0}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <Link to={`/event/${ev.id}`} style={{ color: '#4c1d95', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>View Array &rarr;</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', margin: '0', fontSize: '15px', fontWeight: '500' }}>No active deployments found on this account.</p>
          </div>
        )}
      </div>

    </div>
  );
}