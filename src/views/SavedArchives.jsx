import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function SavedArchives() {
  const navigate = useNavigate();
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  // Security Gateway States
  const [securityPromptId, setSecurityPromptId] = useState(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');

  useEffect(() => {
    // 1. Pull user data for security clearance
    getCurrentUser();
    
    // 2. Hydrate the archive from local browser storage
    const savedData = localStorage.getItem('eventshare_archives');
    if (savedData) {
      setArchivedEvents(JSON.parse(savedData));
    }
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setCurrentUserEmail(session.user.email);
  };

  const handleRemoveArchive = (id) => {
    const updatedArchives = archivedEvents.filter(e => e.id !== id);
    setArchivedEvents(updatedArchives);
    localStorage.setItem('eventshare_archives', JSON.stringify(updatedArchives));
  };

  const handleMediaAccessGateway = (eventItem) => {
    const isOwner = currentUserEmail === eventItem.email || currentUserEmail === eventItem.organiser_id;
    if (!eventItem.is_private || isOwner) {
      navigate(`/event/${eventItem.id}`);
    } else {
      setSecurityPromptId(eventItem.id);
      setEnteredPasscode('');
    }
  };

  const verifyPasscodeGate = (eventItem) => {
    if (enteredPasscode === eventItem.passcode) {
      setSecurityPromptId(null);
      navigate(`/event/${eventItem.id}`);
    } else {
      alert("System Authentication Alert: The passcode provided is invalid.");
    }
  };

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', color: '#0f172a', margin: '0 0 8px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
          Personal Archives
        </h2>
        <p style={{ color: '#64748b', fontSize: '16px', margin: '0', fontWeight: '500' }}>
          Your securely curated collection of pinned media networks and event vaults.
        </p>
      </div>

      {/* Grid Layout for Archives */}
      {archivedEvents.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '32px' }}>
          {archivedEvents.map(event => {
            const coverImage = event.photos && event.photos.length > 0 ? event.photos[0].original_url : null;

            return (
              <div key={event.id} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', background: event.is_private ? '#fff7ed' : '#faf5ff', color: event.is_private ? '#c2410c' : '#6d28d9', padding: '6px 12px', borderRadius: '20px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', border: event.is_private ? '1px solid #ffedd5' : '1px solid #e9d5ff' }}>
                    {event.is_private ? (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Vault</>
                    ) : (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Public</>
                    )}
                  </span>
                  <p style={{ margin: '0', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    {new Date(event.event_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                
                <div style={{ width: '100%', height: '160px', borderRadius: '12px', marginBottom: '20px', background: '#f8fafc', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  {coverImage ? (
                    <img src={coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>No Assets</span>
                    </div>
                  )}
                </div>
                
                <h4 style={{ fontSize: '18px', color: '#0f172a', margin: '0 0 12px 0', fontWeight: '800', lineHeight: '1.4' }}>{event.title}</h4>
                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 24px 0', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  {event.venue_name}, {event.location_city}
                </p>

                {securityPromptId === event.id ? (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: 'auto' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontSize: '12px', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Auth Required
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="password" placeholder="Passcode" value={enteredPasscode} onChange={(e) => setEnteredPasscode(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
                      <button onClick={() => verifyPasscodeGate(event)} style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Verify</button>
                    </div>
                    <button onClick={() => setSecurityPromptId(null)} style={{ width: '100%', marginTop: '8px', background: 'transparent', color: '#64748b', border: 'none', padding: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Cancel Sequence</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button onClick={() => handleMediaAccessGateway(event)} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: event.is_private ? '#ea580c' : '#4c1d95', color: '#ffffff', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      Access Media Array
                    </button>
                    <button onClick={() => handleRemoveArchive(event.id)} title="Remove from Archives" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State Layout */
        <div style={{ textAlign: 'center', padding: '100px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>Your Archive is Empty</h3>
          <p style={{ color: '#64748b', margin: '0 0 24px 0', fontSize: '15px', fontWeight: '500' }}>You haven't pinned any event vaults to your personal collection yet.</p>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f8fafc', color: '#4c1d95', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '14px', transition: 'all 0.2s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Explore Discovery Feed
          </Link>
        </div>
      )}
    </div>
  );
}