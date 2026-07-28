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
  
  // A visual success state to show during the micro-delay
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

        // NEW: Kabarak Domain Restriction & Admin Exception
        const ADMIN_EMAIL = 'ronohlynn2@gmail.com'; 
        const ALLOWED_DOMAIN = '@kabarak.ac.ke';
        
        const userEmail = email.trim().toLowerCase();
        const isKabarakEmail = userEmail.endsWith(ALLOWED_DOMAIN);
        const isAdminEmail = userEmail === ADMIN_EMAIL.toLowerCase();

        if (!isKabarakEmail && !isAdminEmail) {
          alert("Access Restricted: Registrations are strictly limited to Kabarak University emails (@kabarak.ac.ke).");
          setLoading(false);
          return; // Stops the registration process immediately
        }

        const { data, error } = await supabase.auth.signUp({ email: userEmail, password });
        if (error) throw error;
        
        if (data.user) {
          // SECURITY FIX: Public accounts are strictly forced to 'attendee' status
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
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', maxWidth: '420px', margin: '80px auto', padding: '40px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 4px 10px rgba(76, 29, 149, 0.2)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '800', fontSize: '24px', letterSpacing: '-0.5px' }}>
          {isReset ? 'Recover Access' : isSignUp ? 'Create Architecture Profile' : 'Secure Platform Access'}
        </h2>
        <p style={{ margin: '0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
          {isReset 
            ? 'Enter your email to receive a secure recovery token.' 
            : isSignUp 
              ? 'Initialize your deployment credentials.' 
              : 'Enter your parameters to access the grid.'}
        </p>
      </div>
      
      {/* Success Banner during the Micro-Delay */}
      {successMessage && (
        <div style={{ background: '#f0fdf4', border: '1px solid #dcfce3', color: '#16a34a', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {isSignUp && !isReset && (
          <input 
            type="text" 
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Full Name" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
            style={{ padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', color: '#0f172a', fontWeight: '500' }} 
          />
        )}
        
        <input 
          type="email" 
          id="email"
          name="email"
          autoComplete="username email"
          placeholder="Email Address Address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', color: '#0f172a', fontWeight: '500' }} 
        />
        
        {!isReset && (
          <div>
            <input 
              type="password" 
              id="password"
              name="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="Security Passkey" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', color: '#0f172a', fontWeight: '500', boxSizing: 'border-box' }} 
            />
            
            {!isSignUp && (
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button type="button" onClick={toggleReset} style={{ background: 'none', border: 'none', color: '#4c1d95', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                  Forgot Passkey?
                </button>
              </div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || successMessage !== ''} 
          style={{ padding: '16px', background: (loading || successMessage) ? '#c4b5fd' : '#4c1d95', color: '#fff', border: 'none', borderRadius: '10px', cursor: (loading || successMessage) ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '15px', letterSpacing: '0.5px', marginTop: '12px', transition: 'background 0.2s' }}
        >
          {loading ? 'Transmitting Data...' : successMessage ? 'Connection Established' : isReset ? 'Send Recovery Protocol' : isSignUp ? 'Initialize Architecture' : 'Access Network'}
        </button>
      </form>

      <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isReset ? (
          <button onClick={toggleLogin} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            Return to Login Matrix
          </button>
        ) : (
          <button 
            onClick={isSignUp ? toggleLogin : toggleSignUp} 
            style={{ background: 'none', border: 'none', color: '#4c1d95', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}
          >
            {isSignUp ? 'Already hold credentials? Authenticate here' : "No profile found? Request provisioning"}
          </button>
        )}
      </div>
    </div>
  );
}