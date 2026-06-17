import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [mismatchError, setMismatchError] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const navigate = useNavigate();

  const togglePassword = () => setShowPassword(!showPassword);

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    if (val && password !== val) {
      setMismatchError(true);
    } else {
      setMismatchError(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMismatchError(true);
      return;
    }
    setError('');

    try {
      await api.post('/auth/register', {
        email,
        password,
        role: 'patient'
      });

      // login immediately
      const data = await api.post('/auth/login', { email, password });
      api.setToken(data.access_token);
      localStorage.setItem('user_role', data.role);

      // create profile
      await api.post('/profile', { name: fullName });

      setShowToast(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col md:flex-row">
      {/* Left Section: Branding & Identity */}
      <section className="hidden md:flex md:w-5/12 lg:w-1/2 bg-primary relative items-center justify-center p-xl overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-secondary-fixed rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-primary-fixed rounded-full blur-[80px]"></div>
        </div>
        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-lg flex justify-center">
            <div className="bg-surface-container-lowest p-md rounded-2xl shadow-lg animate-float">
              <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
            </div>
          </div>
          <h1 className="text-white font-headline-lg text-headline-lg mb-md leading-tight text-[32px] font-bold">
            Precision Care,<br/>
            <h2 className="text-white font-display-lg text-[48px] mb-md leading-tight font-bold">Your Personal Healthcare OS.</h2>
            <p className="text-primary-fixed-dim font-body-lg text-[18px] opacity-90">
            Join Triagely to experience a new standard of healthcare. Proactive diagnostics and personalized wellness plans tailored specifically to your unique biological markers.
            </p>
          </h1>
          <div className="grid grid-cols-2 gap-md text-left">
            <div className="glass-panel p-md rounded-xl border border-white/10">
              <span className="material-symbols-outlined text-secondary-fixed mb-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <h3 className="text-white font-title-md text-[14px] font-bold">Secure Data</h3>
              <p className="text-white/70 text-[12px]">HIPAA-compliant cloud storage.</p>
            </div>
            <div className="glass-panel p-md rounded-xl border border-white/10">
              <span className="material-symbols-outlined text-secondary-fixed mb-xs" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
              <h3 className="text-white font-title-md text-[14px] font-bold">AI Insights</h3>
              <p className="text-white/70 text-[12px]">Real-time health monitoring.</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full opacity-30 pointer-events-none">
          <img alt="Clinical laboratory" className="w-full h-64 object-cover object-top" style={{ WebkitMaskImage: "linear-gradient(to top, transparent, black)" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyF3Xi88Q48UpVQwk8bJiarMFARCrX-CXhg3YDIeLDHuX7iy1Fspd_FC1-JR3L-G35iPDYZtEvyGtypASpGqVh-P8DX71b8uIhLXz6LXBjXX4B2HGGD5MqY4bSQc8DRoP2yvxzluqZ_FypXkzlbQaVN861rC41X5K0_Zmile1_ZwvFyEr_qCcgJ0sNs8K9ifIRypiu6--wW1DBJpgtQTWbh-3HbZNoA09AjF0qgoQ17py3gIAG8yKbXqFmZmW9sD44Pw1XBjeavfM"/>
        </div>
      </section>

      {/* Right Section: Registration Form */}
      <section className="flex-1 flex items-center justify-center p-margin-mobile md:p-xl bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="md:hidden mb-xl text-center">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
              <span className="text-primary font-bold text-[20px]">Triagely</span>
            </div>
            <h2 className="text-on-surface font-headline-lg text-[32px] font-bold">Create Account</h2>
          </div>
          
          {/* Desktop Form Header */}
          <div className="hidden md:block mb-xl">
            <h2 className="text-on-surface font-headline-lg text-[32px] font-bold tracking-tight">Register</h2>
            <p className="text-on-surface-variant font-body-md text-[16px] mt-sm">Start your journey toward proactive health management today.</p>
          </div>

          {error && (
            <div className="mb-md p-md bg-error-container/30 border border-error-container rounded-xl flex gap-md items-start">
              <span className="material-symbols-outlined text-error">error</span>
              <div>
                <p className="text-[14px] font-bold text-on-error-container">Registration Failed</p>
                <p className="text-[14px] text-on-error-container opacity-80">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-md" onSubmit={handleRegister}>
            <div className="space-y-xs">
              <label className="block text-on-surface-variant font-bold text-[14px]" htmlFor="fullName">Full Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
                <input 
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full pl-[44px] pr-md py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 outline-none transition-all text-on-surface" 
                  id="fullName" placeholder="Enter your full name" required type="text"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="block text-on-surface-variant font-bold text-[14px]" htmlFor="email">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                <input 
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-[44px] pr-md py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 outline-none transition-all text-on-surface" 
                  id="email" placeholder="email@example.com" required type="email"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="block text-on-surface-variant font-bold text-[14px]" htmlFor="password">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                <input 
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-[44px] pr-md py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 outline-none transition-all text-on-surface" 
                  id="password" minLength="8" placeholder="At least 8 characters" required type={showPassword ? "text" : "password"}
                />
                <button className="absolute right-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" onClick={togglePassword} type="button">
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-xs">
              <label className="block text-on-surface-variant font-bold text-[14px]" htmlFor="confirmPassword">Confirm Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">verified</span>
                <input 
                  value={confirmPassword} onChange={handleConfirmPasswordChange}
                  className={`w-full pl-[44px] pr-md py-3 rounded-lg border ${mismatchError ? 'border-error' : 'border-outline-variant'} bg-surface-container-lowest focus:border-primary focus:ring-1 outline-none transition-all text-on-surface`} 
                  id="confirmPassword" placeholder="Repeat your password" required type="password"
                />
              </div>
              {mismatchError && <p className="text-error text-[12px] font-bold mt-xs">Passwords do not match.</p>}
            </div>

            <div className="flex items-start gap-sm pt-xs">
              <input 
                checked={terms} onChange={e => setTerms(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary/20" 
                id="terms" required type="checkbox"
              />
              <label className="text-on-surface-variant text-[12px] font-bold leading-tight" htmlFor="terms">
                I agree to the <a className="text-secondary hover:underline" href="#">Terms of Service</a> and <a className="text-secondary hover:underline" href="#">Privacy Policy</a>.
              </label>
            </div>

            <button className="w-full bg-secondary text-on-secondary py-4 rounded-xl font-bold text-[20px] shadow-md hover:shadow-lg hover:bg-on-secondary-container transition-all active:scale-[0.98] mt-lg" type="submit">
              Create Account
            </button>
          </form>

          <div className="mt-xl text-center">
            <p className="text-on-surface-variant text-[14px] font-bold">
              Already have an account? 
              <Link to="/" className="text-primary hover:text-on-primary-fixed-variant transition-colors ml-xs">Sign In</Link>
            </p>
          </div>

          <div className="mt-3xl flex justify-center items-center gap-md opacity-60">
            <a className="flex items-center gap-xs text-[12px] font-bold hover:opacity-100 transition-opacity" href="#">
              <span className="material-symbols-outlined text-[16px]">help</span>
              Help Center
            </a>
            <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
            <p className="text-[12px] font-bold">© 2024 Triagely</p>
          </div>
        </div>
      </section>

      {/* Success Toast */}
      <div className={`fixed top-margin-desktop right-margin-desktop bg-surface border-l-4 border-secondary p-md rounded-lg shadow-lg transform transition-transform duration-500 z-50 flex items-center gap-md ${showToast ? 'translate-x-0' : 'translate-x-[150%]'}`}>
        <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <div>
          <p className="font-bold text-on-surface text-[14px]">Account Created</p>
          <p className="text-on-surface-variant text-[12px] font-bold">Redirecting to your dashboard...</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
