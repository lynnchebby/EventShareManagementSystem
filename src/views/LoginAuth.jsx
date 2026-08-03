import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function LoginAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState(''); 
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      if (isReset) {
        // --- 1. HANDLE PASSWORD RECOVERY ---
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/settings`,
        });
        
        if (error) throw error;
        alert('System Notice: A secure recovery link has been dispatched to your email.');
        setIsReset(false);
        setLoading(false);

      } else if (isSignUp) {
        // --- 2. HANDLE REGISTRATION ---
        const ADMIN_EMAIL = 'ronohlynn2@gmail.com'; 
        const ALLOWED_DOMAIN = '@kabarak.ac.ke';
        
        const userEmail = email.trim().toLowerCase();
        const isKabarakEmail = userEmail.endsWith(ALLOWED_DOMAIN);
        const isAdminEmail = userEmail === ADMIN_EMAIL.toLowerCase();

        if (!isKabarakEmail && !isAdminEmail) {
          alert("Access Restricted: Registrations are strictly limited to Kabarak University emails (@kabarak.ac.ke).");
          setLoading(false);
          return; 
        }

        const { data, error } = await supabase.auth.signUp({ email: userEmail, password });
        if (error) throw error;
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, full_name: fullName, role: 'attendee' }]);
          
          if (profileError) throw profileError;
          
          alert('System Notice: Registration successful! Check your email for verification.');
          setIsSignUp(false);
          setLoading(false);
        }

      } else {
        // --- 3. HANDLE STANDARD LOGIN ---
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.user) {
          setSuccessMessage('Authentication verified. Accessing matrix...');
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          setTimeout(() => {
            if (profile?.role === 'admin') {
              navigate('/admin');
            } else if (profile?.role === 'organiser') {
              navigate('/organiser');
            } else {
              navigate('/');
            }
          }, 800);
        }
      }
    } catch (err) {
      alert(`Authentication Error: ${err.message}`);
      setLoading(false);
    }
  };

  const toggleSignUp = () => { setIsSignUp(true); setIsReset(false); setSuccessMessage(''); };
  const toggleLogin = () => { setIsSignUp(false); setIsReset(false); setSuccessMessage(''); };
  const toggleReset = () => { setIsReset(true); setIsSignUp(false); setSuccessMessage(''); };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      maxWidth: '900px', 
      minHeight: '520px', 
      margin: '80px auto', 
      background: '#ffffff', 
      borderRadius: '16px', 
      boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)', 
      overflow: 'hidden', 
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' 
    }}>
      
      {/* LEFT PANEL: Deep Purple Branding */}
      <div style={{ 
        flex: '1', 
        background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)', 
        padding: '48px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        color: '#ffffff' 
      }}>
        <div>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.15)', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '32px' }}>
            <span>Event Share</span>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7' }}></div>
          </div>
          
          <h2 style={{ margin: '0 0 16px 0', fontWeight: '800', fontSize: '32px', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
            Event Share Platform
          </h2>
          
          <p style={{ margin: '0', color: '#e9d5ff', fontSize: '14px', fontWeight: '400', lineHeight: '1.6' }}>
            Your secure platform for high-quality event photos. Experience seamless access to curated visual archives and community deployments.
          </p>
        </div>

        <div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>

      {/* RIGHT PANEL: The Form */}
      <div style={{ flex: '1.2', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#ffffff' }}>
        
        {/* Dynamic Form Headers and Simplified Text */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontWeight: '800', fontSize: '24px', letterSpacing: '-0.5px' }}>
            {isReset ? 'Recover Access' : isSignUp ? 'Sign Up' : 'Log In'}
          </h2>
          <p style={{ margin: '0', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
            {isReset 
              ? 'Enter your registered email address below to receive a secure recovery token.' 
              : isSignUp 
                ? 'Enter your details below to create your profile.' 
                : 'Enter your credentials to access the events.'}
          </p>
        </div>

        {successMessage && (
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce3', color: '#16a34a', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {isSignUp && !isReset && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
              <input 
                type="text" 
                id="fullName"
                name="fullName"
                autoComplete="name"
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: '500', transition: 'border-color 0.2s' }} 
              />
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address Address</label>
            <input 
              type="email" 
              id="email"
              name="email"
              autoComplete="username email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: '500' }} 
            />
          </div>
          
          {!isReset && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                {!isSignUp && (
                  <button type="button" onClick={toggleReset} style={{ background: 'none', border: 'none', color: '#4c1d95', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                    Forgot Password?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                id="password"
                name="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: '500', boxSizing: 'border-box' }} 
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || successMessage !== ''} 
            style={{ padding: '16px', background: (loading || successMessage) ? '#c4b5fd' : '#4c1d95', color: '#fff', border: 'none', borderRadius: '10px', cursor: (loading || successMessage) ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', letterSpacing: '0.5px', marginTop: '8px', transition: 'background 0.2s' }}
          >
            {loading ? 'Authenticating...' : successMessage ? 'Connection Established' : isReset ? 'Send Recovery Protocol' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          {isReset ? (
            <button onClick={toggleLogin} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Return to Login Matrix
            </button>
          ) : (
            <button 
              onClick={isSignUp ? toggleLogin : toggleSignUp} 
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
            >
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <span style={{ color: '#4c1d95', fontWeight: '700' }}>{isSignUp ? 'Log In' : 'Sign Up'}</span>
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}