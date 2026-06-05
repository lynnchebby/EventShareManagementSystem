import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function HomeDiscover() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States matching thesis spatial constraints
  const [searchName, setSearchName] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchLiveEvents();
  }, []);

  const fetchLiveEvents = async () => {
    setLoading(true);
    try {
      // Pulls dynamic rows straight from your live Supabase PostgreSQL table
      const { data, error } = await supabase
        .from('events')
        .select('*');
      
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Database connection issue:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Processing search inputs, city classifications, and sorting filters dynamically
  const filteredEvents = events
    .filter(event => {
      const matchesName = event.title.toLowerCase().includes(searchName.toLowerCase());
      const matchesCity = filterCity === '' || event.location_city.toLowerCase() === filterCity.toLowerCase();
      
      // Since event_type isn't strictly defined in the dashboard form yet, we'll auto-match or filter if present
      const matchesType = filterType === '' || (event.event_type && event.event_type.toLowerCase() === filterType.toLowerCase()) || filterType === 'all';
      return matchesName && matchesCity && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.event_date) - new Date(a.event_date);
      if (sortBy === 'oldest') return new Date(a.event_date) - new Date(b.event_date);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div>
      {/* Hero Header Banner Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px', padding: '40px 20px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '12px', color: '#fff' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Find Your Event Memories</h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>Access uncompressed, premium high-quality event photography instantly.</p>
      </div>

      {/* Main Structural Discovery Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Sidebar Filter Panel Boards */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Search Filters</h3>
          
          {/* Text Queries field matches Name spec */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>Event Name</span>
            <input 
              type="text" 
              placeholder="e.g., Tech Week..." 
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
          </label>

          {/* Spatial Constraints Filter matches Nairobi, Nakuru, Mombasa */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>Location City</span>
            <select 
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', background: '#fff' }}
            >
              <option value="">All Cities</option>
              <option value="nairobi">Nairobi</option>
              <option value="nakuru">Nakuru</option>
              <option value="mombasa">Mombasa</option>
            </select>
          </label>

          {/* Chronological Sequencing Control Elements */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>Chronological Order</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', background: '#fff' }}
            >
              <option value="newest">Newest Dates First</option>
              <option value="oldest">Historical Archive First</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </label>

          <button 
            onClick={fetchLiveEvents} 
            style={{ padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#374151' }}
          >
            🔄 Refresh Live Feed
          </button>
        </div>

        {/* Dynamic Display Grid Canvas */}
        <div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Querying system database records...</p>
          ) : filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', background: '#fff', padding: '50px 20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ color: '#4b5563', fontWeight: '500', fontSize: '16px', marginBottom: '8px' }}>No live events active in the database system yet.</p>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Head over to the <b>Organiser Portal</b> to deploy your very first real-time event archive gallery!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredEvents.map((event) => (
                <div 
                  key={event.id} 
                  onClick={() => navigate(`/event/${event.id}`)}
                  style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Event Thumbnail Placeholder Icon */}
                  <div style={{ height: '160px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    📸
                  </div>
                  
                  {/* Metadata Content Binding Parameters */}
                  <div style={{ padding: '20px' }}>
                    {event.is_recurring && (
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '12px' }}>
                        📊 Recurring Event
                      </span>
                    )}
                    <h4 style={{ fontSize: '18px', marginTop: event.is_recurring ? '10px' : '0px', marginBottom: '5px', color: '#111827' }}>{event.title}</h4>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>📍 {event.venue_name}, {event.location_city}</p>
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>📅 {new Date(event.event_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}