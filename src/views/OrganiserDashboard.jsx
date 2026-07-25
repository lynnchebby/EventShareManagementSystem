import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function OrganiserDashboard() {
  // --- Create Form States ---
  const [eventType, setEventType] = useState('tech');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Nairobi');
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [organiserName, setOrganiserName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Visibility & Privacy Gate Layers
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [myDeployedEvents, setMyDeployedEvents] = useState([]);

  // --- Inline Editing Management States ---
  const [editingEventId, setEditingEventId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editCity, setEditCity] = useState('Nairobi');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  // --- Individual Asset Management Layers ---
  const [expandedEventPhotosId, setExpandedEventPhotosId] = useState(null);
  const [currentEventPhotos, setCurrentEventPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  // NEW: Append Files States
  const [appendFiles, setAppendFiles] = useState([]);
  const [appendingPhotos, setAppendingPhotos] = useState(false);

  useEffect(() => {
    if (organiserName.trim() !== '') {
      fetchMyDeployedEvents();
    } else {
      setMyDeployedEvents([]);
    }
  }, [organiserName]);

  const fetchMyDeployedEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`*, photos (id)`)
        .eq('organiser_id', organiserName)
        .order('event_date', { ascending: false });
      
      if (!error && data) setMyDeployedEvents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpandGalleryManager = async (eventId) => {
    if (expandedEventPhotosId === eventId) {
      setExpandedEventPhotosId(null);
      setCurrentEventPhotos([]);
      setAppendFiles([]); // Clear append queue on close
      return;
    }
    
    setExpandedEventPhotosId(eventId);
    setAppendFiles([]); // Clear append queue on open
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
    if (!window.confirm("System Prompt: Delete this individual uncompressed asset from the archive permanently?")) return;
    try {
      const urlParts = photoItem.original_url.split('/event-photos/');
      if (urlParts.length > 1) {
        const storageFilePath = urlParts[1];
        await supabase.storage.from('event-photos').remove([storageFilePath]);
      }
      const { error } = await supabase.from('photos').delete().eq('id', photoItem.id);
      if (error) throw error;
      setCurrentEventPhotos(currentEventPhotos.filter(p => p.id !== photoItem.id));
      fetchMyDeployedEvents();
    } catch (err) {
      alert(`Asset purge failed: ${err.message}`);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];
    let rejectedCount = 0;

    files.forEach(file => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 5) {
        validFiles.push(file);
      } else {
        rejectedCount++;
      }
    });

    if (rejectedCount > 0) {
      alert(`System Notice: ${rejectedCount} file(s) rejected. Individual file capacity ceiling is strictly 5MB.`);
    }
    setSelectedFiles(validFiles.slice(0, 100));
  };

  // NEW: Handle appending new files to an existing event
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

  // NEW: Execute deployment of appended files
  const handleAppendUpload = async (eventId, eventTitle) => {
    if (appendFiles.length === 0) return;
    setAppendingPhotos(true);
    
    try {
      for (let i = 0; i < appendFiles.length; i++) {
        const file = appendFiles[i];
        const fileExtension = file.name.split('.').pop();
        const fileName = `${eventId}/appended-${Date.now()}-${i}.${fileExtension}`;
        
        // Upload to bucket
        const { error: storageError } = await supabase.storage.from('event-photos').upload(fileName, file);
        if (storageError) throw storageError;

        // Fetch URL and insert record
        const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
        const { error: photoTableError } = await supabase.from('photos').insert([
          { event_id: eventId, original_url: urlData.publicUrl, thumbnail_url: urlData.publicUrl, caption: `${eventTitle} - Expanded Frame` }
        ]);
        if (photoTableError) throw photoTableError;
      }
      
      alert(`System Success: ${appendFiles.length} additional assets injected into the array.`);
      setAppendFiles([]);
      
      // Silently refresh the local grid and parent list
      const { data, error } = await supabase.from('photos').select('*').eq('event_id', eventId);
      if (!error && data) setCurrentEventPhotos(data);
      fetchMyDeployedEvents();
      
    } catch (err) {
      alert(`Deployment Exception: ${err.message}`);
    } finally {
      setAppendingPhotos(false);
    }
  };

  const handleCreateEventAndUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setStatusMessage('Validating system deployment protocols...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication synchronization failure.");

      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert([{ title, venue_name: venue, location_city: city, event_date: date, is_recurring: isRecurring, event_type: eventType, is_private: isPrivate, passcode: isPrivate ? passcode : null, organiser_id: organiserName, phone, email: session.user.email, website }])
        .select()
        .single();

      if (eventError) throw eventError;
      setStatusMessage(`Archive profile established. Allocating storage for ${selectedFiles.length} file configurations...`);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExtension = file.name.split('.').pop();
        const fileName = `${newEvent.id}/${Date.now()}-${i}.${fileExtension}`;
        const { error: storageError } = await supabase.storage.from('event-photos').upload(fileName, file);
        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
        const { error: photoTableError } = await supabase.from('photos').insert([{ event_id: newEvent.id, original_url: urlData.publicUrl, thumbnail_url: urlData.publicUrl, caption: `${title} - Capture Frame ${i + 1}` }]);
        if (photoTableError) throw photoTableError;
      }

      setStatusMessage('Deployment Complete: Media gallery successfully mapped to cloud parameters.');
      setTitle(''); setVenue(''); setDate(''); setPasscode(''); setSelectedFiles([]);
      fetchMyDeployedEvents();
    } catch (error) {
      setStatusMessage(`Deployment Exception: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateEventDetails = async (id) => {
    try {
      const { error } = await supabase.from('events').update({ title: editTitle, venue_name: editVenue, location_city: editCity, phone: editPhone, email: editEmail, website: editWebsite }).eq('id', id);
      if (error) throw error;
      setEditingEventId(null);
      fetchMyDeployedEvents();
    } catch (err) { alert(`Update Protocol Failure: ${err.message}`); }
  };

  const handleDeleteEventRecord = async (id) => {
    if (!window.confirm("Critical Warning: Proceeding will permanently purge this entire event architecture from cloud storage clusters. Continue?")) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      fetchMyDeployedEvents();
    } catch (err) { alert(`Purge Failure: ${err.message}`); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      
      {/* Creation Workspace Form Container */}
      <div style={{ background: '#ffffff', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '30px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Organiser Deployment Control</h2>
          <p style={{ color: '#64748b', margin: '0', fontSize: '14px', fontWeight: '500' }}>Configure secure uncompressed media architectures.</p>
        </div>

        <form onSubmit={handleCreateEventAndUpload} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Section 1: Event Logistical Specs & Privacy */}
          <div style={{ background: '#f9f5fe', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 1: Protocol Specifications</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <input type="text" placeholder="Official Event Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              <input type="text" placeholder="Primary Venue Name" value={venue} onChange={(e) => setVenue(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              
              <select value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', outline: 'none' }}>
                <option value="Nairobi">Region: Nairobi</option>
                <option value="Nakuru">Region: Nakuru</option>
                <option value="Mombasa">Region: Mombasa</option>
              </select>

              <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', outline: 'none' }}>
                <option value="tech">Public Sector: Technology Launch</option>
                <option value="sports">Public Sector: Sports Event</option>
                <option value="concerts">Public Sector: Media Concert</option>
                <option value="community">Public Sector: Community Outreach</option>
                <option value="wedding">Private Vault: Wedding Archive</option>
                <option value="corporate">Private Vault: Corporate Functions</option>
              </select>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
            </div>

            {/* Privacy Matrix Toggle Layer */}
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="checkbox" id="privacyToggle" checked={isPrivate} onChange={(e) => { setIsPrivate(e.target.checked); if (e.target.checked && !eventType.match(/wedding|corporate/)) { setEventType('wedding'); } }} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4c1d95' }} />
                <label htmlFor="privacyToggle" style={{ fontSize: '14px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                  Enable Secure Vault Protocols (Restrict access via dynamic passcode)
                </label>
              </div>
              {isPrivate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', marginLeft: '28px' }}>
                  <input type="password" maxLength="6" placeholder="Assign Passcode Parameter" value={passcode} onChange={(e) => setPasscode(e.target.value.replace(/\D/g,''))} required={isPrivate} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '240px', outline: 'none' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Note: Key generation is strictly numeric.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Contact Desk Profile */}
          <div style={{ background: '#f9f5fe', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 2: Administrative Identifiers</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input type="text" placeholder="Lead Administrator Index ID" value={organiserName} onChange={(e) => setOrganiserName(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              <input type="tel" placeholder="Support Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              <input type="email" placeholder="Official Network Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              <input type="url" placeholder="Network Documentation URL (Optional)" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
            </div>
          </div>

          {/* Section 3: High Fidelity Asset Deployment */}
          <div style={{ background: '#f9f5fe', padding: '24px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 3: Media Asset Uploads</h4>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', fontWeight: '500' }}>Strict Parameters: Global limit 100 entries. Matrix ceiling 5MB per block.</p>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} required={myDeployedEvents.length === 0} style={{ fontSize: '13px', color: '#475569', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={uploading} style={{ padding: '16px', background: uploading ? '#c4b5fd' : '#4c1d95', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '15px', letterSpacing: '0.5px', transition: 'background 0.2s', marginTop: '10px' }}>
            {uploading ? 'Executing Cloud Deployment Sequence...' : 'Initialize Secure Event Architecture'}
          </button>

          {statusMessage && <div style={{ background: '#f5f3ff', color: '#5b21b6', padding: '14px', borderRadius: '8px', border: '1px solid #ede9fe', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>{statusMessage}</div>}
        </form>
      </div>

      {/* Live Interactive CRUD Registry Management Log */}
      {organiserName.trim() !== '' && (
        <div style={{ background: '#f9f5fe', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px' }}>Active Operations Ledger</h3>
            <span style={{ background: '#f8fafc', color: '#64748b', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: '1px solid #e2e8f0' }}>Nodes Online: {myDeployedEvents.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {myDeployedEvents.map(ev => {
              const currentPhotoCount = ev.photos?.length || 0;
              const isOverLimit = currentPhotoCount >= 100;
              
              return (
                <div key={ev.id} style={{ padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {editingEventId === ev.id ? (
                    // --- Inline Update Form ---
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patch Architecture Configuration</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
                        <input type="text" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
                        <select value={editCity} onChange={(e) => setEditCity(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', outline: 'none' }}>
                          <option value="Nairobi">Nairobi</option><option value="Nakuru">Nakuru</option><option value="Mombasa">Mombasa</option>
                        </select>
                        <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
                        <input type="url" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button onClick={() => handleUpdateEventDetails(ev.id)} style={{ padding: '10px 20px', background: '#4c1d95', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Execute Matrix Sync</button>
                        <button onClick={() => setEditingEventId(null)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Cancel Sequence</button>
                      </div>
                    </div>
                  ) : (
                    // --- Enterprise Display Row View ---
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>{ev.title}</span>
                            <span style={{ fontSize: '11px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', color: '#64748b', fontWeight: '600' }}>Timestamp: {ev.event_date}</span>
                            <span style={{ fontSize: '11px', background: ev.is_private ? '#fff7ed' : '#f0fdf4', color: ev.is_private ? '#c2410c' : '#16a34a', padding: '4px 8px', borderRadius: '4px', fontWeight: '700', border: ev.is_private ? '1px solid #ffedd5' : '1px solid #dcfce3', textTransform: 'uppercase' }}>
                              {ev.is_private ? 'Protocol: Private Vault' : 'Protocol: Public Subsystem'}
                            </span>
                          </div>
                          <p style={{ margin: '0', fontSize: '13px', color: '#475569', fontWeight: '500' }}>Coordinate: {ev.venue_name}, {ev.location_city}</p>
                        </div>

                        {/* Control Layout Operations Bar */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => toggleExpandGalleryManager(ev.id)} style={{ padding: '8px 16px', background: expandedEventPhotosId === ev.id ? '#0f172a' : '#ffffff', border: '1px solid #cbd5e1', color: expandedEventPhotosId === ev.id ? '#ffffff' : '#334155', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s' }}>
                            {expandedEventPhotosId === ev.id ? 'Retract Database' : 'View Storage Array'}
                          </button>
                          <button onClick={() => { setEditingEventId(ev.id); setEditTitle(ev.title); setEditVenue(ev.venue_name); setEditCity(ev.location_city); setEditPhone(ev.phone || ''); setEditEmail(ev.email || ''); setEditWebsite(ev.website || ''); }} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Edit Record</button>
                          <button onClick={() => handleDeleteEventRecord(ev.id)} style={{ padding: '8px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Delete Record</button>
                        </div>
                      </div>

                      {/* Visual Capacity Tracking Indicator Bar */}
                      <div style={{ marginTop: '20px', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                          <span style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Storage Integrity Capacity Metric</span>
                          <span style={{ color: isOverLimit ? '#ef4444' : '#4c1d95', fontWeight: '800' }}>{currentPhotoCount} / 100 Assigned Blocks</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(currentPhotoCount, 100)}%`, height: '100%', background: isOverLimit ? '#ef4444' : currentPhotoCount > 80 ? '#f59e0b' : '#4c1d95', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Expanded Asset Photo Purger & Uploader Drawer */}
                  {expandedEventPhotosId === ev.id && (
                    <div style={{ marginTop: '12px', background: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      
                      {/* NEW: Upload Additional Media Blocks Strip */}
                      <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>Inject Additional Media Blocks</p>
                          <input type="file" multiple accept="image/*" onChange={handleAppendFileChange} disabled={appendingPhotos || isOverLimit} style={{ fontSize: '13px', color: '#475569', width: '100%' }} />
                        </div>
                        <button 
                          onClick={() => handleAppendUpload(ev.id, ev.title)} 
                          disabled={appendingPhotos || appendFiles.length === 0 || isOverLimit}
                          style={{ padding: '12px 20px', background: (appendingPhotos || appendFiles.length === 0 || isOverLimit) ? '#cbd5e1' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: (appendingPhotos || appendFiles.length === 0 || isOverLimit) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                        >
                          {appendingPhotos ? 'Transmitting Data...' : `Deploy ${appendFiles.length} Assets`}
                        </button>
                      </div>

                      <div style={{ width: '100%', height: '1px', background: '#e2e8f0', marginBottom: '24px' }}></div>

                      <p style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Diagnostic View: Select obsolete or fractured capture components to forcefully prune from the bucket sequence.</p>
                      
                      {loadingPhotos ? (
                        <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Loading file matrix index streams...</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                          {currentEventPhotos.map(ph => (
                            <div key={ph.id} style={{ position: 'relative', height: '100px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                              <img src={ph.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button 
                                onClick={() => handleDeleteSinglePhoto(ph)}
                                style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', background: '#ef4444', color: '#ffffff', border: '1px solid #b91c1c', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}
                                title="Purge Asset Target"
                              >
                                X
                              </button>
                            </div>
                          ))}
                          {currentEventPhotos.length === 0 && (
                            <p style={{ gridColumn: '1/-1', fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>System Log: Architecture node currently contains zero media registries.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}