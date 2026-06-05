import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function EventGallery() {
  const { id } = useParams(); // Grabs the specific Event ID from the URL path
  const [eventDetails, setEventDetails] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded fallback template structures matching your thesis specifications
  const sampleEventsInfo = {
    1: { title: 'Rift Valley Athletics Open', venue_name: 'Afraha Stadium', location_city: 'Nakuru', event_date: '2026-06-15', organiser_name: 'Mr. John Kiprop', phone: '+254 712 345 678', email: 'kiprop@athletics.or.ke', website: 'https://riftathletics.co.ke' },
    2: { title: 'Nairobi Tech Week 2026', venue_name: 'Sarit Centre Expo', location_city: 'Nairobi', event_date: '2026-07-20', organiser_name: 'Lynn Chebet', phone: '+254 722 111 222', email: 'info@techweek.co.ke', website: 'https://nairobitech.ke' },
    3: { title: 'Coast Region Swimming Gala', venue_name: 'Oshwal Academy Pool', location_city: 'Mombasa', event_date: '2026-05-10', organiser_name: 'Coach Salim Ahmed', phone: '+254 733 999 888', email: 'swim@coastgala.com', website: 'https://coastswim.org' }
  };

  useEffect(() => {
    loadGalleryData();
  }, [id]);

  const loadGalleryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch event record data matching this ID from your Supabase Event Records Database
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEventDetails(eventData);

      // 2. Fetch corresponding photo links from your Supabase Visual Content Database (capped at 100)
      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', id)
        .limit(100); // Strict structural enforcement of your 100-photo scope limit

      if (photoError) throw photoError;
      setPhotos(photoData || []);

    } catch (err) {
      console.warn("Using proposal preview structures:", err.message);
      // Fallback data structure execution for demonstration profiles
      setEventDetails(sampleEventsInfo[id] || sampleEventsInfo[2]);
      
      // Generate a mock array of 24 sample items to demonstrate structural lazy loading performance
      const mockPhotosArray = Array.from({ length: 24 }, (_, index) => ({
        id: index + 1,
        url: `https://picsum.photos/seed/${id}-${index}/600/400`,
        caption: `Event Photograph Row Item #${index + 1}`
      }));
      setPhotos(mockPhotosArray);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>Loading Visual Content databases...</p>;
  if (!eventDetails) return <p style={{ textAlign: 'center', color: '#ef4444' }}>Specified event entry could not be found.</p>;

  return (
    <div>
      {/* Back Navigation Action Link */}
      <Link to="/" style={{ display: 'inline-block', marginBottom: '20px', color: '#1d4ed8', textDecoration: 'none', fontWeight: '500' }}>
        ← Back to Discovery Feed
      </Link>

      {/* Structured Split Grid: Left Header Info, Right Organiser Contact Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', marginBottom: '40px', alignItems: 'start' }}>
        <div>
          <h1 style={{ fontSize: '30px', color: '#111827', marginBottom: '10px' }}>{eventDetails.title}</h1>
          <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '6px' }}>📍 {eventDetails.venue_name}, {eventDetails.location_city}</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>📅 {new Date(eventDetails.event_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <div style={{ marginTop: '15px', display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
            📸 Gallery Status: Curated Content (Max 100 Entries Enforced)
          </div>
        </div>

        {/* Organiser Information Contact Block Profile Card (Chapter 1 Compliance) */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '16px', color: '#111827', marginBottom: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>Organiser Business Desk</h3>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>👤 {eventDetails.organiser_name || 'Event Management Team'}</p>
          <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>📞 Phone: {eventDetails.phone || 'Not provided'}</p>
          <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>✉️ Email: {eventDetails.email || 'Not provided'}</p>
          {eventDetails.website && (
            <p style={{ fontSize: '13px', color: '#1d4ed8', marginTop: '8px' }}>
              🌐 <a href={eventDetails.website} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Visit Official Website</a>
            </p>
          )}
        </div>
      </div>

      {/* Main Fluid Grid Image Gallery Block Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {photos.map((photo) => (
          <div 
            key={photo.id} 
            style={{ background: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {/* Native Browser Lazy-Loading Enforcement */}
            <img 
              src={photo.url} 
              alt={photo.caption || 'Event image'} 
              loading="lazy" 
              style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block', background: '#f3f4f6' }}
            />
            <div style={{ padding: '12px' }}>
              <p style={{ fontSize: '13px', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {photo.caption || `Uncompressed Capture _IMG_${photo.id}.jpg`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Zero State Gallery Warning Safeguard */}
      {photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '6px 0', color: '#6b7280' }}>
          <p>No photographs have been cataloged in this archive yet.</p>
        </div>
      )}
    </div>
  );
}