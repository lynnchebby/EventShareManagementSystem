import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function OrganiserDashboard() {
  // Event Metadata States matching Chapter 1 Spec
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Nairobi');
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Organiser Contact Desk States
  const [organiserName, setOrganiserName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Media Upload States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Strict Client-Side File Validation Handler (Upgraded to 5MB Threshold)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];
    let rejectedCount = 0;

    files.forEach(file => {
      const fileSizeInMB = file.size / (1024 * 1024);
      
      // Enforce your updated rule: maximum 5MB per image limit
      if (fileSizeInMB <= 5) {
        validFiles.push(file);
      } else {
        rejectedCount++;
      }
    });

    if (rejectedCount > 0) {
      alert(`⚠️ ${rejectedCount} file(s) rejected! Images must be strictly 5MB or smaller to maintain storage optimization.`);
    }

    // Enforce Chapter 1 rule: maximum 100 photos per gallery capacity limit
    if (validFiles.length > 100) {
      alert("⚠️ Capacity Exceeded: You can only upload a maximum of 100 photos per event gallery.");
      validFiles = validFiles.slice(0, 100);
    }

    setSelectedFiles(validFiles);
  };

  const handleCreateEventAndUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setStatusMessage('Validating system requirements...');

    try {
      // 1. Submit structural record details into your Event Records Database
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert([{
          title,
          venue_name: venue,
          location_city: city,
          event_date: date,
          is_recurring: isRecurring,
          organiser_name: organiserName,
          phone,
          email,
          website
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      setStatusMessage(`Event registered successfully. Uploading ${selectedFiles.length} validated images...`);

      // 2. Loop through individual files and send them to your Visual Content Storage bucket
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExtension = file.name.split('.').pop();
        const fileName = `${newEvent.id}/${Date.now()}-${i}.${fileExtension}`;

        // Upload media file binary straight into Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, file);

        if (storageError) throw storageError;

        // Fetch the newly created public visual URL asset path pointer link
        const { data: urlData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(fileName);

        // Map asset pointer variables safely back down into the photos table schema rows
        const { error: photoTableError } = await supabase
          .from('photos')
          .insert([{
            event_id: newEvent.id,
            url: urlData.publicUrl,
            caption: `${title} - Image Capture #${i + 1}`
          }]);

        if (photoTableError) throw photoTableError;
      }

      setStatusMessage('✨ Success! Event profile established and uncompressed visual galleries live.');
      // Clear forms out upon confirmation
      setTitle(''); setVenue(''); setDate(''); setSelectedFiles([]);
    } catch (error) {
      console.error(error);
      setStatusMessage(`System failure tracking error parameters: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <h2 style={{ marginBottom: '10px', color: '#111827' }}>Organiser Control Center</h2>
      <p style={{ color: '#6b7280', marginBottom: '30px', fontSize: '15px' }}>Register public events and compile curated photo galleries with built-in parameter validations.</p>

      <form onSubmit={handleCreateEventAndUpload} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Section 1: Core Event Context */}
        <div>
          <h4 style={{ color: '#2563eb', marginBottom: '12px', fontSize: '16px', borderBottom: '1px solid #eff6ff', paddingBottom: '4px' }}>Step 1: Event Logistical Specs</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input type="text" placeholder="Official Event Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            <input type="text" placeholder="Specific Venue Name (e.g. Afraha Stadium)" value={venue} onChange={(e) => setVenue(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            
            <select value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff' }}>
              <option value="Nairobi">Nairobi</option>
              <option value="Nakuru">Nakuru</option>
              <option value="Mombasa">Mombasa</option>
            </select>
            
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer', fontSize: '14px', color: '#4b5563' }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            This event occurs on a flexible recurring timeline schedule.
          </label>
        </div>

        {/* Section 2: Organiser Desk Info */}
        <div>
          <h4 style={{ color: '#2563eb', marginBottom: '12px', fontSize: '16px', borderBottom: '1px solid #eff6ff', paddingBottom: '4px' }}>Step 2: Organiser Contact Desk Profile</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input type="text" placeholder="Full Management Name" value={organiserName} onChange={(e) => setOrganiserName(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            <input type="tel" placeholder="Contact Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            <input type="email" placeholder="Business Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            <input type="url" placeholder="Official Website Link (Optional)" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>
        </div>

        {/* Section 3: Visual Storage Limits Media Engine (Updated Text) */}
        <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ color: '#111827', marginBottom: '6px', fontSize: '15px' }}>Step 3: Upload Uncompressed Visual Media Assets</h4>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '15px' }}>System Restrictions Enforced: Max 100 images total. Individual files must not exceed 5MB.</p>
          
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileChange}
            required
            style={{ fontSize: '14px', color: '#4b5563' }}
          />

          {selectedFiles.length > 0 && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: '#059669', fontWeight: '500' }}>
              ✓ {selectedFiles.length} file(s) passed system constraints and are queued for deployment processing.
            </p>
          )}
        </div>

        {/* Status Actions */}
        <button 
          type="submit" 
          disabled={uploading || selectedFiles.length === 0} 
          style={{ padding: '14px', background: uploading ? '#93c5fd' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px' }}
        >
          {uploading ? 'Processing Data Pipeline...' : 'Deploy Event Archive'}
        </button>

        {statusMessage && (
          <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: '500', color: statusMessage.includes('✨') ? '#059669' : '#1d4ed8' }}>
            {statusMessage}
          </p>
        )}

      </form>
    </div>
  );
}