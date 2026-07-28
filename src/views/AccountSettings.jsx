import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function AccountSettings() {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Editable State Variables ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  // --- Strict Password Update States ---
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

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

  // --- NEW: Update Display Name ---
  const handleUpdateName = async () => {
    if (!editNameInput.trim()) return;
    setUpdatingName(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editNameInput })
        .eq('id', session.user.id);

      if (error) throw error;

      // Update local state instantly
      setProfile({ ...profile, full_name: editNameInput });
      setIsEditingName(false);
      alert("System Notice: updated successfully.");
    } catch (err) {
      alert(`Update Failed: ${err.message}`);
    } finally {
      setUpdatingName(false);
    }
  };

  // --- NEW: Strict Password Update ---
  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Security Error: The new passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      alert("Security Notice: Password must be at least 6 characters.");
      return;
    }
    
    setUpdatingPassword(true);
    try {
      // STEP 1: Verify Current Password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        // If sign-in fails, the current password provided was wrong
        throw new Error("Wrong current password. Verification failed.");
      }

      // STEP 2: Current password is correct, proceed to update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Clean up UI state after success
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert("Security Notice: Authentication key successfully updated.");
    } catch (err) {
      alert(`Password Update Failed: ${err.message}`);
    } finally {
      setUpdatingPassword(false);
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

      if (error) throw new Error("Could not save to database. Did you run the SQL command in Supabase?");

      setProfile((prevProfile) => ({ ...prevProfile, application_status: 'pending' }));
      alert("Application transmitted successfully. Awaiting administrative review.");
      
    } catch (err) {
      alert(`Submission Failure: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
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
              Account Details
            </h3>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* INTERACTIVE: Display Name Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {isEditingName ? (
                <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    placeholder="Enter new display name"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                  <button onClick={handleUpdateName} disabled={updatingName} style={{ padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                    {updatingName ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setIsEditingName(false)} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Display Name</p>
                    <p style={{ margin: '0', fontSize: '16px', color: '#0f172a', fontWeight: '600' }}>{profile?.full_name || displayName}</p>
                  </div>
                  <button onClick={() => { setEditNameInput(profile?.full_name || displayName); setIsEditingName(true); }} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                    Edit Name
                  </button>
                </>
              )}
            </div>

            <div style={{ width: '100%', height: '1px', background: '#f1f5f9' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</p>
                <p style={{ margin: '0', fontSize: '16px', color: '#0f172a', fontWeight: '600' }}>{userEmail}</p>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: '#f1f5f9' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Role</p>
                <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '12px', background: userRole === 'admin' ? '#fef2f2' : userRole === 'organiser' ? '#faf5ff' : '#f0fdf4', color: userRole === 'admin' ? '#dc2626' : userRole === 'organiser' ? '#6d28d9' : '#16a34a', padding: '6px 12px', borderRadius: '20px', fontWeight: '800', border: userRole === 'admin' ? '1px solid #fecaca' : userRole === 'organiser' ? '1px solid #e9d5ff' : '1px solid #dcfce3', textTransform: 'uppercase' }}>
                  {userRole}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Organiser Application (Only visible to attendees) */}
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

        {/* Section 3: Security Parameters */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Security & Authentication
            </h3>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* INTERACTIVE: Change Password Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Account Password</p>
                  <p style={{ margin: '0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Update your secure access key.</p>
                </div>
                {!isEditingPassword && (
                  <button onClick={() => setIsEditingPassword(true)} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s' }}>
                    Change Password
                  </button>
                )}
              </div>
              
              {isEditingPassword && (
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Current Password</span>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password to verify identity"
                      required
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </label>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>New Password</span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Confirm New Password</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      required
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button type="submit" disabled={updatingPassword} style={{ flex: 1, padding: '10px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: updatingPassword ? 'not-allowed' : 'pointer' }}>
                      {updatingPassword ? 'Verifying...' : 'Update Password'}
                    </button>
                    <button type="button" onClick={() => { setIsEditingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} style={{ flex: 1, padding: '10px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div style={{ width: '100%', height: '1px', background: '#f1f5f9' }}></div>

            

          </div>
        </div>

        

      </div>
    </div>
  );
}