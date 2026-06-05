import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function LoginAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('attendee'); // Matches 'attendee' spec from project docs
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // 1. Create the user identity inside Supabase Auth
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        alert(error.message);
      } else if (data.user) {
        // 2. Insert their profile record alongside their system role mapping
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, full_name: fullName, role: role }]);
        
        if (profileError) {
          alert(profileError.message);
        } else {
          alert('Registration successful! Check your email for confirmation.');
          setIsSignUp(false);
        }
      }
    } else {
      // Handle logging in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        alert(error.message);
      } else if (data.user) {
        // Fetch user profile to figure out where to route them
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'organiser') {
          navigate('/organiser');
        } else {
          navigate('/');
        }
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '30px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h2 style={{ marginBottom: '20px', textAlign: 'center', color: '#111827' }}>
        {isSignUp ? 'Create System Account' : 'Sign In'}
      </h2>
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {isSignUp && (
          <input 
            type="text" 
            placeholder="Full Name" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} 
          />
        )}
        
        <input 
          type="email" 
          placeholder="Email Address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} 
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} 
        />
        
        {isSignUp && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: '#374151' }}>
            <span>System Domain Role:</span>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)} 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ffffff', background: '#000000' }}
            >
              <option value="attendee">Event Attendee</option>
              <option value="organiser">Event Organiser</option>
            </select>
          </label>
        )}

        <button 
          type="submit" 
          disabled={loading} 
          style={{ padding: '12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '6px', fontSize: '16px', marginTop: '10px' }}
        >
          {loading ? 'Processing...' : isSignUp ? 'Register Account' : 'Log In'}
        </button>
      </form>

      <p 
        onClick={() => setIsSignUp(!isSignUp)} 
        style={{ textAlign: 'center', marginTop: '20px', color: '#1d4ed8', cursor: 'pointer', fontSize: '14px' }}
      >
        {isSignUp ? 'Already have an account? Sign In' : "New to the platform? Create an Account"}
      </p>
    </div>
  );
}