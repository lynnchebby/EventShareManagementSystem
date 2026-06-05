import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomeDiscover from './views/HomeDiscover';
import LoginAuth from './views/LoginAuth'; // <-- Make sure this matches exactly
import OrganiserDashboard from './views/OrganiserDashboard';
import EventGallery from './views/EventGallery';
function App() {
  return (
    <Router>
      <div style={{ fontFamily: 'system-ui, sans-serif', background: '#fcfcfc', minHeight: '100vh' }}>
        {/* Navigation Bar */}
        <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 40px', background: '#ffffff', borderBottom: '1px solid #eaeaea' }}>
          <Link to="/" style={{ fontSize: '22px', fontWeight: 'bold', color: '#1d4ed8', textDecoration: 'none' }}>📸 EventShare</Link>
          <div>
            <Link to="/" style={{ marginRight: '25px', textDecoration: 'none', color: '#374151', fontWeight: '500' }}>Find Events</Link>
            <Link to="/organiser" style={{ marginRight: '25px', textDecoration: 'none', color: '#374151', fontWeight: '500' }}>Organiser Portal</Link>
            <Link to="/login" style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '500' }}>Account</Link>
          </div>
        </nav>

        {/* Dynamic Display Screen */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          <Routes>
            <Route path="/" element={<HomeDiscover />} />
            <Route path="/login" element={<LoginAuth />} />
            <Route path="/organiser" element={<OrganiserDashboard />} />
            <Route path="/event/:id" element={<EventGallery />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;