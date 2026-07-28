import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
const { saveAs } = FileSaver;

export default function EventGallery() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [eventData, setEventData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    fetchEventAndMedia();
  }, [id]);

  const fetchEventAndMedia = async () => {
    try {
      // Fetch Event Details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      
      if (eventError) throw eventError;
      setEventData(event);

      // Fetch Associated Photos
      const { data: media, error: mediaError } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: true });
        
      if (mediaError) throw mediaError;
      setPhotos(media || []);

    } catch (err) {
      console.error("Gallery Fetch Error:", err.message);
      alert("System Error: Could not locate this network registry.");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    if (photos.length === 0) return alert("System Notice: No media assets available to download.");
    
    setDownloadingZip(true);
    setDownloadProgress(0);
    const zip = new JSZip();
    const folder = zip.folder(`${eventData.title.replace(/\s+/g, '_')}_Archive`);

    try {
      // Fetch all images as binary blobs
      const fetchPromises = photos.map(async (photo, index) => {
        try {
          const response = await fetch(photo.original_url);
          const blob = await response.blob();
          
          // Extract extension from URL, default to jpg
          const urlParts = photo.original_url.split('.');
          const ext = urlParts[urlParts.length - 1].split('?')[0] || 'jpg';
          
          folder.file(`Asset_${String(index + 1).padStart(3, '0')}.${ext}`, blob);
          
          // Update progress purely for UX
          setDownloadProgress(prev => prev + (100 / photos.length));
        } catch (fetchErr) {
          console.error("Failed to fetch asset:", photo.original_url);
        }
      });

      await Promise.all(fetchPromises);

      // Generate the ZIP file
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `${eventData.title}_Media_Archive.zip`);
      
    } catch (err) {
      alert(`Compression Protocol Failed: ${err.message}`);
    } finally {
      setDownloadingZip(false);
      setDownloadProgress(0);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#4c1d95' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        <span style={{ fontSize: '15px', fontWeight: '600' }}>Decrypting Secure Vault...</span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Navigation Breadcrumb */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: '600', marginBottom: '32px', transition: 'color 0.2s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Return to Global Feed
      </Link>

      {/* Header & Controls Section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', background: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.02)', marginBottom: '40px' }}>
        
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', background: eventData.is_private ? '#fff7ed' : '#f0fdf4', color: eventData.is_private ? '#ea580c' : '#10b981', padding: '4px 12px', borderRadius: '20px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', border: eventData.is_private ? '1px solid #ffedd5' : '1px solid #dcfce3' }}>
              {eventData.is_private ? 'Secure Private Vault' : 'Public Array'}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
              {new Date(eventData.event_date).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '36px', color: '#0f172a', fontWeight: '800', letterSpacing: '-0.5px' }}>
            {eventData.title}
          </h1>
          <p style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', color: '#475569', fontWeight: '500' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            {eventData.venue_name}, {eventData.location_city}
          </p>

          {/* UPDATED: Detailed Description Rendering */}
          {eventData.detailed_description && (
            <p style={{ margin: '16px 0 0 0', fontSize: '15px', color: '#475569', lineHeight: '1.6', maxWidth: '600px' }}>
              {eventData.detailed_description}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            {eventData.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support Email</p>
                  <p style={{ fontSize: '14px', color: '#0f172a', margin: '0', fontWeight: '600' }}>{eventData.email}</p>
                </div>
              </div>
            )}
            
            {eventData.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support Contact</p>
                  <p style={{ fontSize: '14px', color: '#0f172a', margin: '0', fontWeight: '600' }}>{eventData.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* The New Bulk Download Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          <button 
            onClick={handleBulkDownload} 
            disabled={downloadingZip || photos.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', background: downloadingZip ? '#c4b5fd' : '#4c1d95', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: (downloadingZip || photos.length === 0) ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '800', boxShadow: '0 4px 10px rgba(76, 29, 149, 0.2)', transition: 'all 0.2s' }}
          >
            {downloadingZip ? (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 2s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line></svg> Packaging Files...</>
            ) : (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download Archive (.zip)</>
            )}
          </button>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
            {photos.length} Total Assets
          </span>
        </div>
      </div>

      {/* Progress Bar for ZIP (Only shows when downloading) */}
      {downloadingZip && (
        <div style={{ marginBottom: '40px', background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#4c1d95', marginBottom: '8px' }}>
            <span>Compressing Assets</span>
            <span>{Math.round(downloadProgress)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #4c1d95, #7c3aed)', transition: 'width 0.2s ease-out' }}></div>
          </div>
        </div>
      )}

      {/* The Media Grid (With Lazy Loading Enabled) */}
      {photos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } }}>
              {/* NOTE: loading="lazy" is the performance optimization trick here! */}
              <img 
                src={photo.original_url} 
                alt="Event Asset" 
                loading="lazy" 
                style={{ width: '100%', height: '280px', objectFit: 'cover', display: 'block' }} 
              />
              <a 
                href={photo.original_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'block', width: '100%', padding: '12px', background: '#ffffff', color: '#475569', textAlign: 'center', fontSize: '13px', fontWeight: '700', textDecoration: 'none', borderTop: '1px solid #e2e8f0' }}
              >
                View Full Resolution
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>Array Empty</h3>
          <p style={{ color: '#64748b', margin: '0', fontSize: '15px', fontWeight: '500' }}>No media files have been sent to this node yet.</p>
        </div>
      )}
    </div>
  );
}