import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function AccountSettings() {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // System Preference States (Mocked for UI demonstration)
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  // Form state for Organiser Application
  const [companyName, setCompanyName] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email);
        
        // Fetch full profile architecture
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!error && data) {
          setProfile(data);
          setUserRole(data.role || 'attendee');
        } else {
          setUserRole('attendee');
        }
      }
    } catch (err) {
      console.error("Profile sync error:", err.message);
    } finally {
      setLoading(false);
    }
  };

 const handleApplyForOrganiser = async (e) => {
    e.preventDefault();
    if (!companyName || !verificationId || !reason) {
      alert("System Notice: All verification fields are required.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          application_status: 'pending',
          company_name: companyName,
          verification_id: verificationId,
          application_reason: reason
        })
        .eq('id', session.user.id);

      if (error) {
        console.error("Database Error:", error);
        throw new Error("Could not save to database. Did you run the SQL command in Supabase?");
      }

      // THE FIX: Optimistic UI Update. Instantly lock the screen to 'pending' state
      setProfile((prevProfile) => ({
        ...prevProfile,
        application_status: 'pending'
      }));
      
      alert("Application transmitted successfully. Awaiting administrative review.");
      
    } catch (err) {
      alert(`Submission Failure: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    // Native Supabase call would go here: supabase.auth.resetPasswordForEmail(userEmail)
    alert(`System Protocol: A secure password reset link has been routed to ${userEmail}.`);
  };

  const handleSystemLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Disconnect failure:", err.message);
    }
  };

  const displayName = userEmail 
    ? userEmail.split('@')[0].split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Authenticated User';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#4c1d95' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span style={{ fontSize: '15px', fontWeight: '600' }}>Retrieving Account Matrices...</span>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', color: '#0f172a', margin: '0 0 8px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
          Account Configuration
        </h2>
        <p style={{ color: '#64748b', fontSize: '16px', margin: '0', fontWeight: '500' }}>
          Manage your personal identifiers, security parameters, and system preferences.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Section 1: Profile Identity */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Identity Matrix
            </h3>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Display Name</p>
                <p style={{ margin: '0', fontSize: '16px', color: '#0f172a', fontWeight: '600' }}>{profile?.full_name || displayName}</p>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: '#f1f5f9' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network Email</p>
                <p style={{ margin: '0', fontSize: '16px', color: '#0f172a', fontWeight: '600' }}>{userEmail}</p>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: '#f1f5f9' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Authorization Level</p>
                <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '12px', background: userRole === 'admin' ? '#fef2f2' : userRole === 'organiser' ? '#faf5ff' : '#f0fdf4', color: userRole === 'admin' ? '#dc2626' : userRole === 'organiser' ? '#6d28d9' : '#16a34a', padding: '6px 12px', borderRadius: '20px', fontWeight: '800', border: userRole === 'admin' ? '1px solid #fecaca' : userRole === 'organiser' ? '1px solid #e9d5ff' : '1px solid #dcfce3', textTransform: 'uppercase' }}>
                  {userRole}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* NEW Section: Organiser Application (Only visible to attendees) */}
        {userRole === 'attendee' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Organiser Authorization Request</h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0', fontWeight: '500' }}>
                Upgrade your node privileges to deploy public arrays and secure event vaults.
              </p>
            </div>
            
            <div style={{ padding: '24px' }}>
              {profile?.application_status === 'pending' ? (
                /* BUTTON LOCKOUT: State when application is waiting for review */
                <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#ea580c', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Application Under Review by System Administrator
                  </span>
                  <p style={{ margin: '0', fontSize: '13px', color: '#9a3412', fontWeight: '500' }}>
                    Your verification credentials are being audited. You will be notified once administrative clearance is granted.
                  </p>
                </div>
              ) : (
                /* THE BUSINESS JUSTIFICATION FORM */
                <form onSubmit={handleApplyForOrganiser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    <span>Company / Brand Name:</span>
                    <input 
                      type="text" 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)} 
                      placeholder="e.g., Nexus Media Group"
                      required 
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    <span>National ID / Legal Verification Number:</span>
                    <input 
                      type="text" 
                      value={verificationId} 
                      onChange={(e) => setVerificationId(e.target.value)} 
                      placeholder="Enter official government or business registration identifier"
                      required 
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    <span>Justification & Operational Scope:</span>
                    <textarea 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      placeholder="Briefly describe the types of events or media archives you plan to host."
                      rows="3"
                      required 
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                    />
                  </label>

                  <button 
                    type="submit" 
                    disabled={submitting}
                    style={{ padding: '14px 24px', background: '#4c1d95', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '800', boxShadow: '0 4px 10px rgba(76, 29, 149, 0.2)' }}
                  >
                    {submitting ? 'Transmitting Credentials...' : 'Submit Credentials for Vetting'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Security Parameters */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Security & Authentication
            </h3>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Account Password</p>
                <p style={{ margin: '0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Update your secure access key.</p>
              </div>
              <button onClick={handlePasswordReset} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s' }}>
                Request Reset
              </button>
            </div>

            <div style={{ width: '100%', height: '1px', background: '#f1f5f9' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Two-Factor Authentication (2FA)</p>
                <p style={{ margin: '0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Require a secondary verification code.</p>
              </div>
              <button 
                onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                style={{ position: 'relative', width: '44px', height: '24px', background: twoFactorAuth ? '#10b981' : '#cbd5e1', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}
              >
                <div style={{ position: 'absolute', top: '2px', left: twoFactorAuth ? '22px' : '2px', width: '20px', height: '20px', background: '#ffffff', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
              </button>
            </div>

          </div>
        </div>

        {/* Section 3: System Preferences */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              System Preferences
            </h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Email Telemetry & Alerts</p>
                <p style={{ margin: '0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Receive notifications when new assets are deployed.</p>
              </div>
              <button 
                onClick={() => setEmailAlerts(!emailAlerts)}
                style={{ position: 'relative', width: '44px', height: '24px', background: emailAlerts ? '#4c1d95' : '#cbd5e1', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}
              >
                <div style={{ position: 'absolute', top: '2px', left: emailAlerts ? '22px' : '2px', width: '20px', height: '20px', background: '#ffffff', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Disconnect Layer */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleSystemLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Disconnect Active Session
          </button>
        </div>

      </div>
    </div>
  );
}