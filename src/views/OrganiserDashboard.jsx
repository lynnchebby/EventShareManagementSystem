import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import emailjs from '@emailjs/browser'; 

export default function OrganiserDashboard() {
  // --- Create Form States ---
  const [eventType, setEventType] = useState('tech');
  const [searchTerm, setSearchTerm] = useState('');
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState(''); 
  const [detailedDescription, setDetailedDescription] = useState(''); 
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Nairobi');
  const [date, setDate] = useState('');
  const [organiserName, setOrganiserName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [myDeployedEvents, setMyDeployedEvents] = useState([]);

  // --- Inline Editing Management States ---
  const [editingEventId, setEditingEventId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editShortDescription, setEditShortDescription] = useState(''); 
  const [editDetailedDescription, setEditDetailedDescription] = useState(''); 
  const [editVenue, setEditVenue] = useState('');
  const [editCity, setEditCity] = useState('Nairobi');
  const [editEventType, setEditEventType] = useState('tech'); 
  const [editDate, setEditDate] = useState(''); 
  const [editOrganiserName, setEditOrganiserName] = useState(''); 
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  const [expandedEventPhotosId, setExpandedEventPhotosId] = useState(null);
  const [currentEventPhotos, setCurrentEventPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [appendFiles, setAppendFiles] = useState([]);
  const [appendingPhotos, setAppendingPhotos] = useState(false);

  useEffect(() => {
    fetchMyDeployedEvents();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) fetchMyDeployedEvents();
    });
    return () => authListener.subscription.unsubscribe();
  }, []); 

  const fetchMyDeployedEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Auto-fills the email, but leaves it editable for the user
      setEmail(session.user.email);

      const { data, error } = await supabase
        .from('events')
        .select(`*, photos (id)`)
        .eq('email', session.user.email) 
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
      setAppendFiles([]); 
      return;
    }
    
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
      alert(`Asset Delete failed: ${err.message}`);
    }
  };

const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];
    let rejectedCount = 0;

    files.forEach(file => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) {
        validFiles.push(file);
      } else {
        rejectedCount++;
      }
    });

    if (rejectedCount > 0) {
      alert(`System Notice: ${rejectedCount} file(s) rejected. Individual file capacity ceiling is strictly 20MB.`);
    }
    setSelectedFiles(validFiles.slice(0, 100));
  };

  const handleAppendFileChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];
    let rejectedCount = 0;

    files.forEach(file => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) validFiles.push(file);
      else rejectedCount++;
    });

    if (rejectedCount > 0) alert(`System Notice: ${rejectedCount} file(s) rejected. Capacity ceiling is strictly 20MB.`);
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
      
      alert(`System Success: ${appendFiles.length} additional image added into the gallery.`);
      setAppendFiles([]);
      
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
        .insert([{ title, 
          short_description: shortDescription, 
          detailed_description: detailedDescription, 
          venue_name: venue, 
          location_city: city, 
          event_date: date, 
          event_type: eventType, 
          is_private: false, 
          passcode: null, 
          organiser_id: organiserName, 
          phone, 
          email: session.user.email, 
          website }])
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

      setStatusMessage('Deployment Complete. Triggering email notifications to subscribers...');

      const { data: subs } = await supabase.from('subscriptions').select('attendee_email').eq('organiser_email', session.user.email);
      
      if (subs && subs.length > 0) {
        const emailPromises = subs.map(sub => {
          return emailjs.send(
            'service_7664bkp', 
            'template_e38ztqb', 
            {
              to_email: sub.attendee_email,
              organiser_name: organiserName,
              event_name: title,
              event_date: date
            },
            'KB-iSG5H1iEZlcRsZ' 
          );
        });
        await Promise.all(emailPromises);
        setStatusMessage('Emails dispatched successfully!');
      }

      setTitle(''); setShortDescription(''); setDetailedDescription(''); setVenue(''); setDate(''); setSelectedFiles([]);
      fetchMyDeployedEvents();
      
      setTimeout(() => setStatusMessage(''), 3000);

    } catch (error) {
      setStatusMessage(`Deployment Exception: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateEventDetails = async (id) => {
    try {
      const { error } = await supabase.from('events').update({ title: editTitle, short_description: editShortDescription, detailed_description: editDetailedDescription, venue_name: editVenue, location_city: editCity, event_type: editEventType, event_date: editDate, organiser_id: editOrganiserName, phone: editPhone, email: editEmail, website: editWebsite }).eq('id', id);
      if (error) throw error;
      setEditingEventId(null);
      fetchMyDeployedEvents();
    } catch (err) { alert(`Update Protocol Failure: ${err.message}`); }
  };

  const handleDeleteEventRecord = async (id) => {
    if (!window.confirm("Critical Warning: Proceeding will permanently Delete this entire event architecture from cloud storage clusters. Continue?")) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      fetchMyDeployedEvents();
    } catch (err) { alert(`Delete Failure: ${err.message}`); }
  };

  const filteredEvents = myDeployedEvents.filter(ev => 
    (ev.title && ev.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ev.venue_name && ev.venue_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      
      <div style={{ background: '#ffffff', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '30px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Organiser Event Deployment</h2>
          <p style={{ color: '#64748b', margin: '0', fontSize: '14px', fontWeight: '500' }}>Configure secure uncompressed media architectures.</p>
        </div>

        <form onSubmit={handleCreateEventAndUpload} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div style={{ background: '#f9f5fe', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <input type="text" placeholder=" Event Name" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              <input type="text" placeholder=" Venue Name" value={venue} onChange={(e) => setVenue(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              
              <select value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', outline: 'none' }}>
                <option value="Nairobi">Region: Nairobi</option>
                <option value="Nakuru">Region: Nakuru</option>
                <option value="Mombasa">Region: Mombasa</option>
              </select>

              <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', outline: 'none' }}>
                <option value="tech">Technology</option>
            <option value="sports">Sports</option>
            <option value="medicine">Medicine</option>
            <option value="education">Education</option>
            <option value="Music & Media">Music & Media</option>
            <option value="Business & Economics">Business & Economics</option>
            <option value="Law">Law</option>
              </select>
              
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
              
              <textarea 
                placeholder="Short Description (Shown on Discovery Feed)" 
                value={shortDescription} 
                onChange={(e) => setShortDescription(e.target.value)} 
                required
                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', gridColumn: '1 / -1', resize: 'vertical', minHeight: '60px' }} 
              />
              
              <textarea 
                placeholder="Detailed Description & Objectives (Shown inside Event Gallery)" 
                value={detailedDescription} 
                onChange={(e) => setDetailedDescription(e.target.value)} 
                required
                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', gridColumn: '1 / -1', resize: 'vertical', minHeight: '100px' }} 
              />
            </div>
          </div>

        <div style={{ background: '#f9f5fe', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
          <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}> Organiser Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            <input 
              type="text" 
              placeholder="Company/Organiser Name" 
              value={organiserName} 
              onChange={(e) => setOrganiserName(e.target.value)} 
              required 
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} 
            />
            
            <input 
              type="tel" 
              placeholder="Phone Number" 
              value={phone} 
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                setPhone(numericValue);
              }} 
              pattern="[0-9]*"
              inputMode="numeric"
              required 
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} 
            />
            
            {/* UPDATED: Fully Editable again */}
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} 
            />
            
            <input 
              type="url" 
              placeholder="Website URL (Optional)" 
              value={website} 
              onChange={(e) => setWebsite(e.target.value)} 
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} 
            />
            
          </div>
        </div>

          <div style={{ background: '#f9f5fe', padding: '24px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}> Media Image Uploads</h4>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', fontWeight: '500' }}>Upload a promotional flyer for upcoming events, or the official photo gallery after the event concludes. <br />Upload Limits: Up to 100 images, maximum 20MB per file. </p>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} required={myDeployedEvents.length === 0} style={{ fontSize: '13px', color: '#475569', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={uploading} style={{ padding: '16px', background: uploading ? '#c4b5fd' : '#4c1d95', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '15px', letterSpacing: '0.5px', transition: 'background 0.2s', marginTop: '10px' }}>
            {uploading ? 'Deploying event...' : 'Deploy Event '}
          </button>

          {statusMessage && <div style={{ background: '#f5f3ff', color: '#5b21b6', padding: '14px', borderRadius: '8px', border: '1px solid #ede9fe', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>{statusMessage}</div>}
        </form>
      </div>

      <div style={{ background: '#f9f5fe', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px' }}>DEPLOYED EVENTS</h3>
          <span style={{ background: '#f8fafc', color: '#64748b', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: '1px solid #e2e8f0' }}>Events Online: {myDeployedEvents.length}</span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <input 
            type="text" 
            placeholder="Search your deployed events by title or venue..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', color: '#0f172a', fontWeight: '500', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredEvents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', margin: '0' }}>
                {searchTerm ? 'No events match your search criteria.' : 'No active deployments found. Initialize an archive above.'}
              </p>
            </div>
          ) : (
            filteredEvents.map(ev => {
              const currentPhotoCount = ev.photos?.length || 0;
              const isOverLimit = currentPhotoCount >= 100;
              
              return (
                <div key={ev.id} style={{ padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                {editingEventId === ev.id ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
      <p style={{ margin: '0', fontSize: '13px', fontWeight: '800', color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Patch Architecture Configuration
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event Title</span>
          <input 
            type="text" 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a' }} 
          />
        </label>
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Venue Name</span>
          <input 
            type="text" 
            value={editVenue} 
            onChange={(e) => setEditVenue(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a' }} 
          />
        </label>
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location / City</span>
          <select 
            value={editCity} 
            onChange={(e) => setEditCity(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none', color: '#0f172a' }}
          >
            <option value="Nairobi">Nairobi</option>
            <option value="Nakuru">Nakuru</option>
            <option value="Mombasa">Mombasa</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</span>
          <input 
            type="date" 
            value={editDate} 
            onChange={(e) => setEditDate(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a' }} 
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Protocol Type</span>
          <select 
            value={editEventType} 
            onChange={(e) => setEditEventType(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none', color: '#0f172a' }}
          >
            <option value="tech">Technology</option>
            <option value="sports">Sports</option>
            <option value="medicine">Medicine</option>
            <option value="education">Education</option>
            <option value="Music & Media">Music & Media</option>
            <option value="Business & Economics">Business & Economics</option>
            <option value="Law">Law</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Organiser Name</span>
          <input 
            type="text" 
            value={editOrganiserName} 
            onChange={(e) => setEditOrganiserName(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a' }} 
          />
        </label>
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support Phone</span>
          <input 
            type="tel" 
            value={editPhone} 
            onChange={(e) => {
              const numericValue = e.target.value.replace(/[^0-9]/g, '');
              setEditPhone(numericValue);
            }} 
            pattern="[0-9]*"
            inputMode="numeric"
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a' }} 
          />
        </label>
        
        {/* UPDATED: Fully Editable again */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network Email</span>
          <input 
            type="email" 
            value={editEmail} 
            onChange={(e) => setEditEmail(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a' }} 
          />
        </label>
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Documentation URL</span>
          <input 
            type="url" 
            value={editWebsite} 
            onChange={(e) => setEditWebsite(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a' }} 
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Short Description</span>
          <textarea 
            value={editShortDescription} 
            onChange={(e) => setEditShortDescription(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a', resize: 'vertical', minHeight: '50px' }} 
          />
        </label>
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detailed Description</span>
          <textarea 
            value={editDetailedDescription} 
            onChange={(e) => setEditDetailedDescription(e.target.value)} 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#0f172a', resize: 'vertical', minHeight: '80px' }} 
          />
        </label>
        
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
        <button onClick={() => handleUpdateEventDetails(ev.id)} style={{ padding: '10px 20px', background: '#4c1d95', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' }}>
          Save 
        </button>
        <button onClick={() => setEditingEventId(null)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' }}>
          Cancel 
        </button>
      </div>
    </div>
  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>{ev.title}</span>
                            <span style={{ fontSize: '11px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', color: '#64748b', fontWeight: '600' }}>Date: {ev.event_date}</span>
                          </div>
                          <p style={{ margin: '0', fontSize: '13px', color: '#475569', fontWeight: '500' }}>Venue: {ev.venue_name}, {ev.location_city}</p>
                          
                          {ev.short_description && <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b', fontStyle: 'italic', maxWidth: '600px' }}>"{ev.short_description}"</p>}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => toggleExpandGalleryManager(ev.id)} style={{ padding: '8px 16px', background: expandedEventPhotosId === ev.id ? '#0f172a' : '#ffffff', border: '1px solid #cbd5e1', color: expandedEventPhotosId === ev.id ? '#ffffff' : '#334155', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s' }}>
                            {expandedEventPhotosId === ev.id ? 'Retract Database' : 'View Record'}
                          </button>
                          <button onClick={() => { setEditingEventId(ev.id); setEditTitle(ev.title); setEditShortDescription(ev.short_description || ''); setEditDetailedDescription(ev.detailed_description || ''); setEditVenue(ev.venue_name); setEditCity(ev.location_city); setEditEventType(ev.event_type || 'tech'); setEditDate(ev.event_date || ''); setEditOrganiserName(ev.organiser_id || ''); setEditPhone(ev.phone || ''); setEditEmail(ev.email || ''); setEditWebsite(ev.website || ''); }} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Edit Record</button>
                          <button onClick={() => handleDeleteEventRecord(ev.id)} style={{ padding: '8px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Delete Record</button>
                        </div>
                      </div>

                      <div style={{ marginTop: '20px', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                          <span style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event Storage </span>
                          <span style={{ color: isOverLimit ? '#ef4444' : '#4c1d95', fontWeight: '800' }}>{currentPhotoCount} / 100 Images</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(currentPhotoCount, 100)}%`, height: '100%', background: isOverLimit ? '#ef4444' : currentPhotoCount > 80 ? '#f59e0b' : '#4c1d95', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedEventPhotosId === ev.id && (
                    <div style={{ marginTop: '12px', background: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      
                      <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>Choose an image to add to this event </p>
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

                      <p style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Event  View: select image to remove it from this event gallery.</p>
                      
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
                                title="Delete Asset Target"
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
            })
          )}
        </div>
      </div>

    </div>
  );
}