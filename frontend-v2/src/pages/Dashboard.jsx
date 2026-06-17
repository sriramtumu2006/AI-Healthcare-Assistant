import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [healthTip, setHealthTip] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, profRes] = await Promise.allSettled([
          api.get('/dashboard'),
          api.get('/profile')
        ]);

        if (dashRes.status === 'fulfilled') {
          setHealthTip(dashRes.value.health_tip);
          setAppointments(dashRes.value.upcoming_appointments || []);
        }
        if (profRes.status === 'fulfilled') {
          setProfile(profRes.value);
        }
      } catch (err) {
        console.error("Dashboard error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Layout>
      <main className="pt-24 pb-24 lg:pb-8 lg:ml-64 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-[1440px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-xl gap-md">
            <div>
              <h1 className="font-headline-lg text-[32px] font-bold text-primary mb-xs">
                Welcome back, {profile?.name?.split(' ')[0] || 'User'}
              </h1>
              <p className="font-body-md text-[16px] text-on-surface-variant max-w-2xl">{healthTip || 'Your health metrics are looking stable today. You have upcoming appointments.'}</p>
            </div>
            <Link to="/appointments" className="bg-secondary text-on-secondary px-lg py-3 rounded-xl font-bold flex items-center gap-sm shadow-md hover:opacity-90 transition-opacity w-fit">
              <span className="material-symbols-outlined">add_circle</span>
              Book New Consultation
            </Link>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
            
            {/* Quick Health Metric Widgets */}
            <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-md">
              <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-lg">
                <div className="w-14 h-14 rounded-full bg-error-container/20 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-outline uppercase tracking-wider">Health Risk Score</p>
                  <p className="font-bold text-[32px] text-on-surface">
                    Low <span className="text-[14px] font-normal text-on-surface-variant">Risk</span>
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-lg">
                <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>folder_supervised</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-outline uppercase tracking-wider">Records Indexed</p>
                  <p className="font-bold text-[32px] text-on-surface">
                    12 <span className="text-[14px] font-normal text-on-surface-variant">Docs</span>
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-lg">
                <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-outline uppercase tracking-wider">Next Medication</p>
                  <p className="font-bold text-[32px] text-on-surface">
                    2h <span className="text-[14px] font-normal text-on-surface-variant">Lisinopril</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="md:col-span-8 bg-surface-container-lowest p-xl rounded-3xl shadow-sm border border-outline-variant/20">
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-bold text-[20px] text-primary flex items-center gap-sm">
                  <span className="material-symbols-outlined">calendar_today</span> Upcoming Appointments
                </h2>
                <Link className="text-secondary font-bold text-[14px] hover:underline" to="/appointments">View All</Link>
              </div>
              <div className="space-y-md">
                {loading ? (
                  <div className="flex items-center gap-lg p-md rounded-2xl bg-surface-container-low/50 border border-outline-variant/10">
                    <div className="w-16 h-16 rounded-xl skeleton-shimmer flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 skeleton-shimmer rounded"></div>
                      <div className="h-3 w-1/2 skeleton-shimmer rounded"></div>
                    </div>
                  </div>
                ) : appointments.length > 0 ? (
                  appointments.map(apt => (
                    <div key={apt.id} className="flex items-center gap-lg p-md rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-secondary transition-colors cursor-pointer group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-primary-fixed flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-3xl">medical_services</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[16px] font-bold text-on-surface">Doctor #{apt.doctor_id}</p>
                        <p className="text-[14px] font-bold text-on-surface-variant">Appointment</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[16px] font-bold text-primary">{apt.date}</p>
                        <p className="text-[14px] font-bold text-on-surface-variant">{apt.time}</p>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">chevron_right</span>
                    </div>
                  ))
                ) : (
                  <p className="text-on-surface-variant">No upcoming appointments.</p>
                )}
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="md:col-span-4 bg-surface-container-lowest p-xl rounded-3xl shadow-sm border border-outline-variant/20">
              <h2 className="font-bold text-[20px] text-primary mb-lg flex items-center gap-sm">
                <span className="material-symbols-outlined">history</span> Activity Log
              </h2>
              <div className="relative space-y-lg before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-secondary-fixed flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-xs text-on-secondary-fixed">medication</span>
                  </div>
                  <p className="text-[14px] font-bold text-on-surface">Meds Logged: Lisinopril</p>
                  <p className="text-[12px] font-bold text-on-surface-variant">Today, 8:00 AM</p>
                </div>
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-xs text-on-primary-fixed">description</span>
                  </div>
                  <p className="text-[14px] font-bold text-on-surface">Lab Results Updated</p>
                  <p className="text-[12px] font-bold text-on-surface-variant">Yesterday, 4:20 PM</p>
                </div>
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-xs text-on-surface-variant">person</span>
                  </div>
                  <p className="text-[14px] font-bold text-on-surface">Profile Updated</p>
                  <p className="text-[12px] font-bold text-on-surface-variant">Oct 20, 2023</p>
                </div>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="md:col-span-7 bg-primary text-on-primary p-xl rounded-3xl shadow-lg relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-white/10 text-[12px] font-bold mb-md backdrop-blur-md">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Triagely Intelligence
                </div>
                <h2 className="font-bold text-[24px] md:text-[32px] mb-md leading-tight tracking-tight">Insight: Cardiovascular trends are improving.</h2>
                <p className="text-[16px] opacity-90 mb-xl">Your average resting heart rate has decreased by 4% over the last 14 days. This correlates with your increased evening walking activity. Keep up the consistent pace!</p>
                <div className="flex gap-md">
                  <button className="bg-secondary-container text-on-secondary-container px-lg py-2 rounded-xl font-bold text-[14px] hover:brightness-105 transition-all">View Trends</button>
                  <button className="bg-white/10 text-white px-lg py-2 rounded-xl font-bold text-[14px] hover:bg-white/20 transition-all border border-white/20">Learn More</button>
                </div>
              </div>
            </div>

            {/* Recent Symptom Analysis */}
            <div className="md:col-span-5 bg-surface-container-lowest p-xl rounded-3xl shadow-sm border border-outline-variant/20">
              <div className="flex justify-between items-start mb-lg">
                <div>
                  <h2 className="font-bold text-[20px] text-primary">Symptom History</h2>
                  <p className="text-[14px] font-bold text-on-surface-variant">Last checked: 2 days ago</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-error-container text-on-error-container text-[12px] font-bold">Needs Review</div>
              </div>
              <div className="p-lg rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 mb-lg">
                <div className="flex items-center gap-md mb-md">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>medical_information</span>
                  <p className="text-[14px] font-bold text-on-surface">Analysis: Occasional Headaches</p>
                </div>
                <p className="text-[14px] font-bold text-on-surface-variant line-clamp-2">Reported mild tension headaches occurring in late afternoon. AI suggested monitoring hydration and screen time.</p>
              </div>
              <Link to="/symptom-checker" className="w-full py-3 rounded-xl border-2 border-dashed border-outline-variant text-on-surface-variant font-bold text-[14px] hover:bg-surface-container-low hover:border-secondary transition-all flex items-center justify-center gap-sm">
                <span className="material-symbols-outlined">add</span> Start New Analysis
              </Link>
            </div>

          </div>
        </div>
      </main>

      {/* FAB / Quick Chat Entry Point */}
      <div className="fixed bottom-24 lg:bottom-12 right-margin-mobile lg:right-margin-desktop z-50">
        <Link to="/chat" className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-secondary text-on-secondary shadow-2xl flex items-center justify-center group hover:scale-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-2xl md:text-3xl">chat</span>
          <div className="absolute right-full mr-4 bg-inverse-surface text-inverse-on-surface px-4 py-2 rounded-xl text-[14px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            Chat with Triagely
          </div>
        </Link>
      </div>
    </Layout>
  );
};

export default Dashboard;
