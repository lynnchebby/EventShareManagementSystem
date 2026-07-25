import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function HomeDiscover() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  
  const [pinnedEvents, setPinnedEvents] = useState(() => {
    const saved = localStorage.getItem('eventshare_archives');
    return saved ? JSON.parse(saved) : [];
  }); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedEventType, setSelectedEventType] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // --- Inline Edit States ---
  const [editingEventId, setEditingEventId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editCity, setEditCity] = useState('Nairobi');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  // --- NEW: Media Management States for Owners ---
  const [expandedEventPhotosId, setExpandedEventPhotosId] = useState(null);
  const [currentEventPhotos, setCurrentEventPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [appendFiles, setAppendFiles] = useState([]);
  const [appendingPhotos, setAppendingPhotos] = useState(false);

  // --- Security Gateway States ---
  const [securityPromptId, setSecurityPromptId] = useState(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchLiveEvents();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setCurrentUserEmail(session.user.email);
  };

  const fetchLiveEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`*, photos ( original_url )`)
        .order('event_date', { ascending: false })
        .limit(50); 

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error(err.message);
    } finally { 
      setLoading(false); 
    }
  };

  const handleTogglePin = (eventItem) => {
    let updatedPins;
    if (pinnedEvents.some(e => e.id === eventItem.id)) {
      updatedPins = pinnedEvents.filter(e => e.id !== eventItem.id);
    } else {
      updatedPins = [...pinnedEvents, eventItem];
    }
    setPinnedEvents(updatedPins);
    localStorage.setItem('eventshare_archives', JSON.stringify(updatedPins));
  };

  const handleShareLink = (eventId) => {
    const link = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => console.error("Clipboard API failure:", err));
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

  // --- TEXT DATA EDITING ---
  const startEditingMode = (eventItem) => {
    setEditingEventId(eventItem.id); 
    setExpandedEventPhotosId(null); // Close media manager if open
    setEditTitle(eventItem.title); 
    setEditVenue(eventItem.venue_name);
    setEditCity(eventItem.location_city); 
    setEditPhone(eventItem.phone || ''); 
    setEditEmail(eventItem.email || ''); 
    setEditWebsite(eventItem.website || '');
  };

  const handleUpdateEventDetails = async (id) => {
    try {
      const { error } = await supabase.from('events').update({ title: editTitle, venue_name: editVenue, location_city: editCity, phone: editPhone, email: editEmail, website: editWebsite }).eq('id', id);
      if (error) throw error;
      setEvents(prevEvents => prevEvents.map(event => event.id === id ? { ...event, title: editTitle, venue_name: editVenue, location_city: editCity, phone: editPhone, email: editEmail, website: editWebsite } : event));
      setEditingEventId(null);
    } catch (err) { alert(`Update failed: ${err.message}`); }
  };

  const handleDeleteEventRecord = async (id) => {
    if (!window.confirm("Critical Action: Confirm permanent deletion of this event archive.")) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      setPinnedEvents(pinnedEvents.filter(e => e.id !== id));
      fetchLiveEvents();
    } catch (err) { alert(`Delete failure: ${err.message}`); }
  };

  // --- NEW: MEDIA MANAGEMENT LOGIC FOR DISCOVERY FEED ---
  const toggleExpandGalleryManager = async (eventId) => {
    if (expandedEventPhotosId === eventId) {
      setExpandedEventPhotosId(null);
      setCurrentEventPhotos([]);
      setAppendFiles([]);
      return;
    }
    
    setEditingEventId(null); // Close text editor if open
    setExpandedEventPhotosId(eventId);
    setAppendFiles([]);
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase.from('photos').select('*').eq('event_id', eventId);
      if (!error && data) setCurrentEventPhotos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDeleteSinglePhoto = async (photoItem) => {
    if (!window.confirm("System Prompt: Delete this individual uncompressed asset permanently?")) return;
    try {
      const urlParts = photoItem.original_url.split('/event-photos/');
      if (urlParts.length > 1) {
        const storageFilePath = urlParts[1];
        await supabase.storage.from('event-photos').remove([storageFilePath]);
      }
      const { error } = await supabase.from('photos').delete().eq('id', photoItem.id);
      if (error) throw error;
      setCurrentEventPhotos(currentEventPhotos.filter(p => p.id !== photoItem.id));
      fetchLiveEvents(); // Refresh feed to update cover image if needed
    } catch (err) {
      alert(`Asset purge failed: ${err.message}`);
    }
  };

  const handleAppendFileChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];
    let rejectedCount = 0;

    files.forEach(file => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 5) validFiles.push(file);
      else rejectedCount++;
    });

    if (rejectedCount > 0) alert(`System Notice: ${rejectedCount} file(s) rejected. Capacity ceiling is 5MB.`);
    setAppendFiles(validFiles.slice(0, 100));
  };

  const handleAppendUpload = async (eventId, eventTitle) => {
    if (appendFiles.length === 0) return;
    setAppendingPhotos(true);
    
    try {
      for (let i = 0; i < appendFiles.length; i++) {
        const file = appendFiles[i];
        const fileExtension = file.name.split('.').pop();
        const fileName = `${eventId}/appended-${Date.now()}-${i}.${fileExtension}`;
        
        const { error: storageError } = await supabase.storage.from('event-photos').upload(fileName, file);
        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
        const { error: photoTableError } = await supabase.from('photos').insert([
          { event_id: eventId, original_url: urlData.publicUrl, thumbnail_url: urlData.publicUrl, caption: `${eventTitle} - Expanded Frame` }
        ]);
        if (photoTableError) throw photoTableError;
      }
      
      alert(`System Success: ${appendFiles.length} additional assets injected into the array.`);
      setAppendFiles([]);
      
      const { data, error } = await supabase.from('photos').select('*').eq('event_id', eventId);
      if (!error && data) setCurrentEventPhotos(data);
      fetchLiveEvents(); // Refresh global feed
      
    } catch (err) {
      alert(`Deployment Exception: ${err.message}`);
    } finally {
      setAppendingPhotos(false);
    }
  };

  // --- FILTERING ---
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.venue_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All' || event.location_city === selectedCity;
    const matchesType = selectedEventType === 'All' || event.event_type === selectedEventType;
    return matchesSearch && matchesCity && matchesType;
  });

  const displayName = currentUserEmail 
    ? currentUserEmail.split('@')[0].split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Explorer';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#4c1d95' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span style={{ fontSize: '15px', fontWeight: '600' }}>Synchronizing Data Streams...</span>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      
      {/* Personalized Welcome Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '32px', color: '#0f172a', margin: '0 0 8px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
          Welcome back, {displayName}.
        </h2>
        <p style={{ color: '#64748b', fontSize: '16px', margin: '0', fontWeight: '500' }}>
          Your secure gateway to curated event media and high-resolution visual archives.
        </p>
      </div>

      {/* Enterprise Search Command Center */}
      <div style={{ background: '#ffffff', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '48px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02)' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '20px' }}>
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search registry by title, venue, or keywords..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '16px 20px 16px 52px', borderRadius: '10px', border: 'none', fontSize: '15px', outline: 'none', color: '#0f172a', backgroundColor: '#f8fafc', fontWeight: '500' }}
          />
        </div>

        <div style={{ width: '1px', height: '32px', background: '#e2e8f0', display: 'block' }}></div>
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select 
            value={selectedEventType} 
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{ padding: '16px 24px 16px 16px', borderRadius: '10px', border: 'none', background: 'transparent', fontSize: '15px', cursor: 'pointer', outline: 'none', color: '#0f172a', fontWeight: '600', minWidth: '160px' }}
          >
            <option value="All">All Categories</option>
            <option value="tech">Technology</option>
            <option value="sports">Sports</option>
            <option value="concerts">Concerts</option>
            <option value="community">Community</option>
            <option value="wedding">Weddings</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>

        <div style={{ width: '1px', height: '32px', background: '#e2e8f0', display: 'block' }}></div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select 
            value={selectedCity} 
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{ padding: '16px 24px 16px 16px', borderRadius: '10px', border: 'none', background: 'transparent', fontSize: '15px', cursor: 'pointer', outline: 'none', color: '#0f172a', fontWeight: '600', minWidth: '150px' }}
          >
            <option value="All">Global Matrix</option>
            <option value="Nairobi">Nairobi</option>
            <option value="Nakuru">Nakuru</option>
            <option value="Mombasa">Mombasa</option>
          </select>
        </div>
      </div>

      {/* Pinned Bookmarks Widget */}
      {pinnedEvents.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            Pinned Workspaces
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {pinnedEvents.map(event => (
              <div key={event.id} style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #4c1d95', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div>
                  <h4 style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 8px 0', fontWeight: '800' }}>{event.title}</h4>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', margin: '0', fontWeight: '500' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    {event.venue_name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button onClick={() => handleMediaAccessGateway(event)} style={{ flex: 1, background: '#f8fafc', color: '#4c1d95', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Access Media</button>
                  <button onClick={() => handleTogglePin(event)} style={{ background: 'transparent', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Unpin</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery Feed Grid Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '24px', color: '#0f172a', margin: '0', fontWeight: '800', letterSpacing: '-0.5px' }}>Active Event Archives</h3>
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Showing {filteredEvents.length} results</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '32px' }}>
        {filteredEvents.map(event => {
          const isPinned = pinnedEvents.some(e => e.id === event.id);
          const isOwner = currentUserEmail === event.email || currentUserEmail === event.organiser_id;
          const coverImage = event.photos && event.photos.length > 0 ? event.photos[0].original_url : null;
          const currentPhotoCount = event.photos?.length || 0;
          const isOverLimit = currentPhotoCount >= 100;

          return (
            <div key={event.id} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.01)', position: 'relative' }}>
              
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: event.is_private ? 'linear-gradient(90deg, #ea580c, #f97316)' : 'linear-gradient(90deg, #4c1d95, #7c3aed)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}></div>

              {editingEventId === event.id ? (
                // --- INLINE EDIT FORM FOR OWNERS (TEXT DATA) ---
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700', color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Edit Record Parameters
                  </p>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                  <input type="text" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                  <select value={editCity} onChange={(e) => setEditCity(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', width: '100%', outline: 'none' }}>
                    <option value="Nairobi">Nairobi</option><option value="Nakuru">Nakuru</option><option value="Mombasa">Mombasa</option>
                  </select>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => handleUpdateEventDetails(event.id)} style={{ flex: 1, padding: '12px', background: '#4c1d95', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Save Matrix</button>
                    <button onClick={() => setEditingEventId(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                // --- PREMIUM DISPLAY VIEW ---
                <>
                  <div style={{ marginTop: '8px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', background: event.is_private ? '#fff7ed' : '#faf5ff', color: event.is_private ? '#c2410c' : '#6d28d9', padding: '6px 12px', borderRadius: '20px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', border: event.is_private ? '1px solid #ffedd5' : '1px solid #e9d5ff' }}>
                        {event.is_private ? (
                           <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Private Vault</>
                        ) : (
                           <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Public Catalog</>
                        )}
                      </span>
                      <p style={{ margin: '0', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                        {new Date(event.event_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    
                    <div style={{ width: '100%', height: '180px', borderRadius: '12px', marginBottom: '20px', background: '#f1f5f9', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      {coverImage ? (
                        <img src={coverImage} alt="Event Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                          <span style={{ fontSize: '12px', fontWeight: '600' }}>No Media Assets Uploaded</span>
                        </div>
                      )}
                    </div>
                    
                    <h4 style={{ fontSize: '20px', color: '#0f172a', margin: '0 0 16px 0', fontWeight: '800', lineHeight: '1.4' }}>{event.title}</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', color: '#0f172a', margin: '0', fontWeight: '600' }}>{event.venue_name}</p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '0', fontWeight: '500' }}>{event.location_city}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', color: '#0f172a', margin: '0', fontWeight: '600' }}>Management Desk</p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '0', fontWeight: '500' }}>{event.email || 'System Default'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {securityPromptId === event.id ? (
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: 'auto' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontSize: '12px', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Auth Required
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="password" placeholder="Passcode Entry" value={enteredPasscode} onChange={(e) => setEnteredPasscode(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
                        <button onClick={() => verifyPasscodeGate(event)} style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Verify</button>
                      </div>
                      <button onClick={() => setSecurityPromptId(null)} style={{ width: '100%', marginTop: '8px', background: 'transparent', color: '#64748b', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Cancel Sequence</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleMediaAccessGateway(event)} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: event.is_private ? '#ea580c' : '#4c1d95', color: '#ffffff', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {event.is_private ? (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Unlock Vault</>
                          ) : (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Open Desk</>
                          )}
                        </button>
                        
                        <button onClick={() => handleShareLink(event.id)} title="Copy Share Link" style={{ background: '#ffffff', color: copiedId === event.id ? '#10b981' : '#64748b', border: '1px solid #cbd5e1', padding: '0 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                          {copiedId === event.id ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                          )}
                        </button>

                        <button onClick={() => handleTogglePin(event)} title={isPinned ? 'Unpin Gallery' : 'Pin Gallery'} style={{ background: isPinned ? '#faf5ff' : '#ffffff', color: isPinned ? '#4c1d95' : '#64748b', border: isPinned ? '1px solid #e9d5ff' : '1px solid #cbd5e1', padding: '0 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={isPinned ? '#4c1d95' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                      </div>

                      {/* --- NEW: EXTRA CONTROLS ONLY SHOWN TO THE OWNER --- */}
                      {isOwner && (
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '4px' }}>
                          <button onClick={() => startEditingMode(event)} title="Edit Text Details" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          
                          {/* The Media Management Button */}
                          <button onClick={() => toggleExpandGalleryManager(event.id)} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 0', background: expandedEventPhotosId === event.id ? '#0f172a' : '#f8fafc', border: '1px solid #e2e8f0', color: expandedEventPhotosId === event.id ? '#ffffff' : '#475569', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            {expandedEventPhotosId === event.id ? 'Close Manager' : 'Manage Media'}
                          </button>
                          
                          <button onClick={() => handleDeleteEventRecord(event.id)} title="Delete Entire Event" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- NEW: THE MEDIA EXPANSION DRAWER (ONLY VISIBLE IF OPENED) --- */}
                  {expandedEventPhotosId === event.id && isOwner && (
                    <div style={{ marginTop: '16px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      
                      {/* Upload Additional Media Strip */}
                      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ margin: '0', fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>Inject Additional Media</p>
                        <input type="file" multiple accept="image/*" onChange={handleAppendFileChange} disabled={appendingPhotos || isOverLimit} style={{ fontSize: '12px', color: '#475569', width: '100%', padding: '6px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        <button 
                          onClick={() => handleAppendUpload(event.id, event.title)} 
                          disabled={appendingPhotos || appendFiles.length === 0 || isOverLimit}
                          style={{ padding: '10px', background: (appendingPhotos || appendFiles.length === 0 || isOverLimit) ? '#cbd5e1' : '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: (appendingPhotos || appendFiles.length === 0 || isOverLimit) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '800', transition: 'background 0.2s' }}
                        >
                          {appendingPhotos ? 'Transmitting Data...' : `Deploy ${appendFiles.length} New Assets`}
                        </button>
                      </div>

                      <div style={{ width: '100%', height: '1px', background: '#cbd5e1', marginBottom: '20px' }}></div>

                      {/* Photo Deletion Grid */}
                      <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Diagnostic View (Click X to Purge)</p>
                      
                      {loadingPhotos ? (
                        <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Loading file matrix...</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
                          {currentEventPhotos.map(ph => (
                            <div key={ph.id} style={{ position: 'relative', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img src={ph.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button 
                                onClick={() => handleDeleteSinglePhoto(ph)}
                                style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}
                              >
                                X
                              </button>
                            </div>
                          ))}
                          {currentEventPhotos.length === 0 && (
                            <p style={{ gridColumn: '1/-1', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No media registries found.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* --- END MEDIA EXPANSION DRAWER --- */}

                </>
              )}
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', marginTop: '40px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <p style={{ color: '#475569', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '600' }}>No network registries found matching the current search parameters.</p>
          <button 
            onClick={() => { setSearchQuery(''); setSelectedCity('All'); setSelectedEventType('All'); }}
            style={{ background: '#4c1d95', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}