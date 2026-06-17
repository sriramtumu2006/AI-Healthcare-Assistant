import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';

const Layout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  const getNavClass = (targetPath) => {
    return path === targetPath 
      ? "bg-secondary-container text-on-secondary-container" 
      : "text-on-surface-variant hover:bg-surface-container-high";
  };

  const getTopNavClass = (targetPath) => {
    return path === targetPath
      ? "text-primary border-b-2 border-primary pb-1"
      : "text-on-surface-variant hover:text-primary transition-colors";
  };

  const handleLogout = () => {
    api.logout();
    window.location.href = '/';
  };

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-xl">
          <span className="text-title-md font-title-md font-bold text-primary">Triagely</span>
          <nav className="hidden md:flex gap-lg">
            <Link className={`${getTopNavClass('/dashboard')} font-label-md text-label-md`} to="/dashboard">Dashboard</Link>
            <Link className={`${getTopNavClass('/symptom-checker')} font-label-md text-label-md`} to="/symptom-checker">Symptom Checker</Link>
            <Link className={`${getTopNavClass('/chat')} font-label-md text-label-md`} to="/chat">Medical Records</Link>
            <Link className={`${getTopNavClass('/medications')} font-label-md text-label-md`} to="#">Medications</Link>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input className="pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest text-label-md font-label-md focus:outline-none focus:border-secondary" placeholder="Search records..." type="text"/>
          </div>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
          <div className="relative hidden md:flex items-center gap-2 border border-outline-variant rounded-full px-3 py-1 cursor-pointer hover:bg-surface-container-high transition-colors">
            <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-[12px] font-bold">
              Me
            </div>
            <span className="text-label-md font-bold text-on-surface">Self Profile</span>
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
            <img alt="User avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQe0WpUqcEWpYMqlEpivtgf6R3tJ5Kwe7Ot5noPZ2rgPHbNX_aT12B_uv7aerxCE-4igwuFYeHs1J7OO7KNNyqBzkrLPDkW4nYXtmjx4draDGDA9eIZUm6K7C4op7hmdgXeLdzscq-xYxMD0Q_YucmLkVvu2vV6W6qY7b30DZlclbHm9yjiEpgDMqq3TA9YMGnN54Pimyb8--QCMuD422GX9FavyEbvimdmE6SpyX9P9tH5VG3mv62c9fpbCTu_4UsCvp4JMnea18"/>
          </div>
        </div>
      </header>

      {/* SideNavBar (Desktop Only) */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] p-md w-64 z-40 bg-surface-container-low border-r border-outline-variant">
        <div className="mb-xl flex items-center gap-md px-2">
          <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">health_and_safety</span>
          </div>
          <div>
            <p className="text-label-md font-bold text-primary">Triagely OS</p>
            <p className="text-label-sm text-outline">Role: Patient</p>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-sm">
          <Link className={`flex items-center gap-md px-4 py-3 rounded-lg font-bold scale-[0.98] transition-all duration-150 ${getNavClass('/dashboard')}`} to="/dashboard">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-label-md">Dashboard</span>
          </Link>
          <Link className={`flex items-center gap-md px-4 py-3 rounded-lg transition-colors ${getNavClass('/symptom-checker')}`} to="/symptom-checker">
            <span className="material-symbols-outlined">medical_services</span>
            <span className="text-label-md">Symptom Checker</span>
          </Link>
          <Link className={`flex items-center gap-md px-4 py-3 rounded-lg transition-colors ${getNavClass('/appointments')}`} to="/appointments">
            <span className="material-symbols-outlined">event</span>
            <span className="text-label-md">Appointments</span>
          </Link>
          <Link className={`flex items-center gap-md px-4 py-3 rounded-lg transition-colors ${getNavClass('/chat')}`} to="/chat">
            <span className="material-symbols-outlined">description</span>
            <span className="text-label-md">Medical Records</span>
          </Link>
          <Link className={`flex items-center gap-md px-4 py-3 rounded-lg transition-colors ${getNavClass('/medications')}`} to="#">
            <span className="material-symbols-outlined">medication</span>
            <span className="text-label-md">Medications</span>
          </Link>
          <Link className={`flex items-center gap-md px-4 py-3 rounded-lg transition-colors text-on-surface-variant hover:bg-surface-container-high`} to="#">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-label-md">Settings</span>
          </Link>
        </nav>
        <div className="mt-auto pt-lg flex flex-col gap-sm border-t border-outline-variant">
          <button className="w-full bg-error text-on-error py-3 rounded-lg font-bold text-label-md flex items-center justify-center gap-sm mb-lg shadow-sm active:scale-95 transition-transform">
            <span className="material-symbols-outlined">emergency</span> Emergency SOS
          </button>
          <Link className="flex items-center gap-md px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors" to="#">
            <span className="material-symbols-outlined">contact_support</span>
            <span className="text-label-md">Help Center</span>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-md px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-md">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      {children}

      {/* BottomNavBar (Mobile Only) */}
      <footer className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface shadow-lg rounded-t-xl">
        <Link className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-95 transition-all ${path === '/dashboard' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container'}`} to="/dashboard">
          <span className="material-symbols-outlined">home</span>
          <span className="text-label-sm font-label-sm">Home</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center rounded-full px-4 py-1 transition-all ${path === '/symptom-checker' || path === '/chat' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container'}`} to="/chat">
          <span className="material-symbols-outlined">chat_bubble</span>
          <span className="text-label-sm font-label-sm">Chat</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center rounded-full px-4 py-1 transition-all ${path === '/appointments' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container'}`} to="/appointments">
          <span className="material-symbols-outlined">folder_shared</span>
          <span className="text-label-sm font-label-sm">Records</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all" to="/dashboard">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="text-label-sm font-label-sm">Profile</span>
        </Link>
      </footer>
    </div>
  );
};

export default Layout;
