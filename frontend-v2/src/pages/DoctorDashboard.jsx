import { useState, useEffect } from 'react';
import { api } from '../api';
import Layout from '../components/Layout';

const DoctorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response);
      } catch (err) {
        setError('Failed to load clinician dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full min-h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-xl bg-error-container text-on-error-container rounded-xl m-xl">
          <h2 className="text-xl font-bold mb-sm">Error</h2>
          <p>{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="pt-24 pb-24 lg:pb-8 lg:ml-64 px-margin-mobile md:px-margin-desktop">
        <div className="p-xl max-w-7xl mx-auto space-y-2xl">
        <header className="flex justify-between items-end border-b border-outline-variant pb-md">
          <div>
            <h1 className="text-[32px] font-bold text-on-surface">Clinician Portal</h1>
            <p className="text-[16px] text-on-surface-variant mt-xs">Overview of your daily schedule and patient insights.</p>
          </div>
          <div className="flex gap-sm">
            <button className="px-md py-sm bg-secondary text-white rounded-lg font-bold flex items-center gap-xs hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">add</span>
              New Note
            </button>
          </div>
        </header>

        {/* Action Alert (AI Tip) */}
        {data.health_tip && (
          <div className="bg-primary/10 border border-primary/30 p-lg rounded-2xl flex gap-md items-start">
            <span className="material-symbols-outlined text-primary text-[28px]">notifications_active</span>
            <div>
              <h3 className="font-bold text-[18px] text-primary mb-xs">System Alert</h3>
              <p className="text-[16px] text-on-surface-variant leading-relaxed">{data.health_tip}</p>
            </div>
          </div>
        )}

        {/* Schedule */}
        <section>
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-[24px] font-bold text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary text-[28px]">calendar_today</span>
              Today's Schedule
            </h2>
            <span className="text-[14px] font-bold bg-surface-container-high px-md py-xs rounded-full">
              {data.upcoming_appointments?.length || 0} Appointments
            </span>
          </div>

          {data.upcoming_appointments && data.upcoming_appointments.length > 0 ? (
            <div className="grid gap-md">
              {data.upcoming_appointments.map((apt) => (
                <div key={apt.id} className="bg-surface p-lg rounded-2xl shadow-sm border border-outline-variant hover:border-secondary transition-colors group cursor-pointer flex justify-between items-center">
                  <div className="flex items-center gap-lg">
                    <div className="flex flex-col items-center justify-center w-20 h-20 bg-secondary/10 rounded-xl text-secondary">
                      <span className="text-[20px] font-bold">{apt.time}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-[18px] text-on-surface mb-xs">Patient ID: {apt.patient_id}</h4>
                      <p className="text-[14px] text-on-surface-variant flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px]">event</span>
                        {apt.date} • {apt.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="px-md py-sm bg-surface-container-high text-on-surface rounded-lg font-bold hover:bg-surface-container-highest">
                      View Chart
                    </button>
                    <button className="px-md py-sm bg-primary text-white rounded-lg font-bold">
                      Start Visit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-2xl p-2xl text-center">
              <span className="material-symbols-outlined text-[48px] text-outline mb-md">event_available</span>
              <h3 className="text-[20px] font-bold text-on-surface">No Appointments</h3>
              <p className="text-[16px] text-on-surface-variant max-w-md mx-auto mt-xs">
                You have no scheduled patient visits for today. Enjoy your administrative time!
              </p>
            </div>
          )}
        </section>
      </div>
      </main>
    </Layout>
  );
};

export default DoctorDashboard;
