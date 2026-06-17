import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

const Login = () => {
  const [activeTab, setActiveTab] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Admin specific
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminOtpStage, setAdminOtpStage] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const switchTab = (role) => {
    setActiveTab(role);
    setError('');
    if (role !== 'admin') {
      setAdminOtpStage(false);
    }
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.post('/auth/login', { email, password });
      api.setToken(data.access_token);
      localStorage.setItem('user_role', data.role);
      if (data.role === 'doctor') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    }
  };

  const handleDoctorLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.post('/auth/login', { email, password });
      api.setToken(data.access_token);
      localStorage.setItem('user_role', data.role);
      navigate('/doctor-dashboard');
    } catch (err) {
      setError(err.message || 'Login failed.');
    }
  };

  const handleAdminContinue = () => {
    setAdminOtpStage(true);
  };

  const hideOTP = () => {
    setAdminOtpStage(false);
  };

  const handleOtpKeyUp = (e, index) => {
    if (e.key >= '0' && e.key <= '9') {
      if (index < otpRefs.length - 1) {
        otpRefs[index + 1].current.focus();
      }
    } else if (e.key === 'Backspace') {
      if (index > 0) {
        otpRefs[index - 1].current.focus();
      }
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex overflow-hidden">
      {/* Left Branding Section (Desktop Only) */}
      <section className="hidden lg:flex flex-col justify-between w-[45%] bg-primary-container relative overflow-hidden p-3xl">
        <div className="absolute inset-0 opacity-20 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-sm mb-xl">
            <span className="material-symbols-outlined text-primary-fixed-dim text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
            <h1 className="text-white font-headline-lg text-[32px] tracking-tight">Triagely</h1>
          </div>
          <div className="max-w-md">
            <h2 className="text-white font-display-lg text-[48px] mb-md leading-tight font-bold">Precision Intelligence for Human Wellness.</h2>
            <p className="text-primary-fixed font-body-lg text-[18px] opacity-80">Access your clinical dashboard, patient records, and AI-driven diagnostic tools with enterprise-grade security.</p>
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex gap-lg items-center text-primary-fixed-dim opacity-60">
            <div className="flex flex-col">
              <span className="text-[12px] font-bold">ISO 27001</span>
              <span className="text-[12px] font-bold">HIPAA COMPLIANT</span>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold">ENCRYPTION</span>
              <span className="text-[12px] font-bold">AES-256 BIT</span>
            </div>
          </div>
        </div>
        {/* Abstract Medical Background Image */}
        <div className="absolute bottom-0 right-0 w-full h-full -z-10 mix-blend-overlay">
          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAneSzkINXhT4E7YNKfuaeuVDeXneIxWoDNJIyi1bvDS4EByUp5lDkaZgbYQBeqgfSApPp9bd13IGFMjlE0KPbWUJv8hRna3Nu_O-GwR3c4jQzi9Da9schzqvXixy7-Xcf3Flb7-UMSUsj9xanTMsh3kIULdy3MfnC8-_3Y-A43HAY81zeq64N5tVg7mQFXR9EWNoaE2qEX38_uT9vuhsenTzn-uSO1oGz9xsl5LHaDV2jHTpplKzsQGt2sW_0PICfkhnXJ1oOIUL0')" }}>
          </div>
        </div>
      </section>

      {/* Right Login Section */}
      <main className="w-full lg:w-[55%] h-screen overflow-y-auto flex items-center justify-center p-margin-mobile md:p-2xl bg-surface-container-lowest">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-sm mb-xl">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
            <span className="text-primary font-headline-lg text-[32px] tracking-tight font-bold">Triagely</span>
          </div>
          <header className="mb-xl text-center lg:text-left">
            <h3 className="text-on-surface font-headline-lg text-[32px] mb-xs font-bold">Welcome back</h3>
            <p className="text-on-surface-variant font-body-md text-[16px]">Please select your role to continue to your workspace.</p>
          </header>

          {error && (
            <div className="mb-md p-md bg-error-container/30 border border-error-container rounded-xl flex gap-md items-start">
              <span className="material-symbols-outlined text-error">error</span>
              <div>
                <p className="text-label-md font-bold text-on-error-container">Login Failed</p>
                <p className="text-body-md text-on-error-container opacity-80 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Role Tabs */}
          <div className="flex p-unit bg-surface-container-high rounded-xl mb-xl">
            <button 
              className={`flex-1 flex items-center justify-center gap-xs py-md rounded-lg transition-all duration-200 text-[14px] font-bold ${activeTab === 'patient' ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => switchTab('patient')}
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              Patient Login
            </button>
            <button 
              className={`flex-1 flex items-center justify-center gap-xs py-md rounded-lg transition-all duration-200 text-[14px] font-bold ${activeTab === 'doctor' ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => switchTab('doctor')}
            >
              <span className="material-symbols-outlined text-[20px]">medical_services</span>
              Doctor Login
            </button>
            <button 
              className={`flex-1 flex items-center justify-center gap-xs py-md rounded-lg transition-all duration-200 text-[14px] font-bold ${activeTab === 'admin' ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => switchTab('admin')}
            >
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              Admin Login
            </button>
          </div>

          {/* Tab Panels */}
          <div className="space-y-lg">
            
            {/* Patient Tab */}
            {activeTab === 'patient' && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <form className="space-y-md" onSubmit={handlePatientLogin}>
                  <div className="space-y-xs">
                    <label className="text-[14px] font-bold text-on-surface ml-unit">Email Address</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">mail</span>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-[48px] pr-md py-3 rounded-lg border border-outline-variant bg-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                        placeholder="name@example.com" 
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <div className="flex justify-between items-center px-unit">
                      <label className="text-[14px] font-bold text-on-surface">Password</label>
                      <button className="text-[12px] font-bold text-secondary hover:underline" type="button">Forgot Password?</button>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">lock</span>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-[48px] pr-md py-3 rounded-lg border border-outline-variant bg-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                        placeholder="••••••••" 
                        required
                      />
                    </div>
                  </div>
                  <button className="w-full py-3 bg-secondary text-white rounded-lg font-bold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all shadow-md" type="submit">
                    Login to Patient Portal
                  </button>
                  <div className="pt-md text-center">
                    <span className="text-on-surface-variant text-[16px]">New to Triagely?</span>
                    <Link to="/register" className="text-secondary font-bold text-[14px] ml-xs hover:underline">Register Account</Link>
                  </div>
                </form>
              </div>
            )}

            {/* Doctor Tab */}
            {activeTab === 'doctor' && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <form className="space-y-md" onSubmit={handleDoctorLogin}>
                  <div className="space-y-xs">
                    <label className="text-[14px] font-bold text-on-surface ml-unit">Doctor Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-md py-3 rounded-lg border border-outline-variant bg-surface focus:border-secondary outline-none transition-all" placeholder="name@hospital.com" type="email" required />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-[14px] font-bold text-on-surface ml-unit">Professional Password</label>
                    <input value={password} onChange={e => setPassword(e.target.value)} className="w-full px-md py-3 rounded-lg border border-outline-variant bg-surface focus:border-secondary outline-none transition-all" placeholder="••••••••" type="password" required />
                  </div>
                  <button className="w-full py-3 bg-primary text-white rounded-lg font-bold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all shadow-md" type="submit">
                    Secure Clinician Access
                  </button>
                  <div className="pt-sm text-center">
                    <p className="text-[12px] text-outline">Hint: Try <b>alice.smith@hospital.com</b> / <b>password123</b></p>
                  </div>
                </form>
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <form className="space-y-md">
                  {!adminOtpStage ? (
                    <div className="space-y-md">
                      <div className="space-y-xs">
                        <label className="text-[14px] font-bold text-on-surface ml-unit">Admin Username</label>
                        <input value={adminUsername} onChange={e => setAdminUsername(e.target.value)} className="w-full px-md py-3 rounded-lg border border-outline-variant bg-surface focus:border-secondary outline-none transition-all" placeholder="admin_v1" type="text" />
                      </div>
                      <div className="space-y-xs">
                        <label className="text-[14px] font-bold text-on-surface ml-unit">Master Password</label>
                        <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full px-md py-3 rounded-lg border border-outline-variant bg-surface focus:border-secondary outline-none transition-all" placeholder="••••••••" type="password" />
                      </div>
                      <button onClick={handleAdminContinue} className="w-full py-3 bg-tertiary-container text-on-tertiary-container border border-outline rounded-lg font-bold text-[14px] hover:bg-tertiary transition-all" type="button">
                        Continue to MFA
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-xl animate-in zoom-in-95">
                      <div className="text-center py-md">
                        <span className="material-symbols-outlined text-4xl text-secondary mb-md">shield_person</span>
                        <h4 className="text-[20px] font-bold">Multi-Factor Authentication</h4>
                        <p className="text-[16px] text-on-surface-variant">Enter the 6-digit code sent to your registered device.</p>
                      </div>
                      <div className="flex justify-between gap-sm">
                        {otpRefs.map((ref, idx) => (
                          <input 
                            key={idx} 
                            ref={ref}
                            onKeyUp={(e) => handleOtpKeyUp(e, idx)}
                            className="w-12 h-14 text-center text-xl font-bold border border-outline-variant rounded-lg bg-surface focus:border-secondary outline-none" 
                            maxLength="1" 
                            type="text" 
                          />
                        ))}
                      </div>
                      <div className="space-y-sm">
                        <button className="w-full py-3 bg-secondary text-white rounded-lg font-bold text-[14px] shadow-lg" type="button">
                          Verify & Log In
                        </button>
                        <button onClick={hideOTP} className="w-full text-center text-[12px] font-bold text-outline hover:text-on-surface py-xs transition-colors" type="button">
                          Return to Credentials
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            )}

          </div>

          {/* Global Footer Information */}
          <footer className="mt-2xl flex flex-col items-center gap-md">
            <div className="flex gap-lg">
              <a className="text-[12px] font-bold text-on-surface-variant hover:text-secondary transition-colors" href="#">Privacy Policy</a>
              <a className="text-[12px] font-bold text-on-surface-variant hover:text-secondary transition-colors" href="#">Terms of Service</a>
              <a className="text-[12px] font-bold text-on-surface-variant hover:text-secondary transition-colors" href="#">Help Center</a>
            </div>
            <p className="text-[12px] font-bold text-outline">© 2024 Triagely Systems Inc. All rights reserved.</p>
          </footer>

        </div>
      </main>
    </div>
  );
};

export default Login;
