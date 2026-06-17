import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

const DoctorBooking = () => {
  const [modalDoctor, setModalDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [selectedDate, setSelectedDate] = useState('18');
  const [selectedTime, setSelectedTime] = useState('10:30 AM');

  const openBookingModal = (doctorName) => {
    setModalDoctor(doctorName);
    document.body.classList.add('overflow-hidden');
  };

  const closeBookingModal = () => {
    setModalDoctor(null);
    document.body.classList.remove('overflow-hidden');
  };

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await api.get('/doctors');
        setDoctors(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDoctors();
  }, []);

  const confirmBooking = async () => {
    try {
      await api.post('/appointment/book', {
        doctor_id: modalDoctor.id,
        date: `2026-06-${selectedDate.padStart(2, '0')}`,
        time: selectedTime
      });
      closeBookingModal();
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    } catch (err) {
      alert("Booking failed: " + err.message);
    }
  };

  return (
    <Layout>
      <main className="lg:ml-64 pt-20 pb-24 px-margin-mobile md:px-margin-desktop min-h-screen">
        <header className="mb-xl pt-10">
          <h1 className="text-headline-lg font-headline-lg text-[32px] text-primary font-bold">Find a Medical Specialist</h1>
          <p className="text-body-md text-[16px] text-on-surface-variant mt-xs">Expert healthcare tailored to your needs.</p>
        </header>

        {/* Search & Filter Bento */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-2xl">
          <div className="md:col-span-3 bg-surface-container-lowest p-lg rounded-2xl shadow-sm flex flex-col md:flex-row gap-lg items-center border border-outline-variant/30">
            <div className="flex-1 w-full">
              <label className="text-[12px] font-bold text-outline mb-xs block tracking-widest uppercase">Search by Name or Specialty</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">person_search</span>
                <input className="w-full pl-11 pr-md py-md bg-surface-container rounded-xl border-none focus:ring-2 focus:ring-secondary outline-none" placeholder="e.g. Cardiologist, Dr. Smith" type="text" />
              </div>
            </div>
            <div className="w-full md:w-64">
              <label className="text-[12px] font-bold text-outline mb-xs block tracking-widest uppercase">Location</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">location_on</span>
                <input className="w-full pl-11 pr-md py-md bg-surface-container rounded-xl border-none focus:ring-2 focus:ring-secondary outline-none" placeholder="San Francisco, CA" type="text" />
              </div>
            </div>
            <button className="w-full md:w-auto h-full px-xl py-md bg-secondary text-on-secondary rounded-xl font-bold flex items-center justify-center gap-md hover:opacity-90 transition-all">
              <span className="material-symbols-outlined">search</span>
              Search
            </button>
          </div>

          <div className="bg-surface-container-low p-lg rounded-2xl flex flex-col justify-center border border-outline-variant">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-bold text-primary text-[16px]">Filters</h3>
              <span className="text-xs text-secondary cursor-pointer font-bold">Reset All</span>
            </div>
            <div className="flex flex-wrap gap-sm">
              <span className="bg-secondary-container text-on-secondary-container px-sm py-1 rounded-full text-[12px] font-bold flex items-center gap-xs">
                4.5+ Rating <span className="material-symbols-outlined text-[16px] cursor-pointer">close</span>
              </span>
              <span className="bg-secondary-container text-on-secondary-container px-sm py-1 rounded-full text-[12px] font-bold flex items-center gap-xs">
                Cardiology <span className="material-symbols-outlined text-[16px] cursor-pointer">close</span>
              </span>
            </div>
          </div>
        </section>

        {/* Specialized Categories */}
        <section className="mb-2xl">
          <div className="flex justify-between items-center mb-lg">
            <h2 className="text-[20px] font-bold text-on-surface">Popular Specialties</h2>
            <button className="text-secondary font-bold text-[14px] flex items-center gap-xs hover:underline">
              View All <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
          <div className="flex gap-md overflow-x-auto pb-md custom-scrollbar">
            {[
              { icon: 'favorite', name: 'Cardiology', bg: 'bg-secondary-container', fg: 'text-secondary' },
              { icon: 'psychology', name: 'Neurology', bg: 'bg-surface-container-high', fg: 'text-primary' },
              { icon: 'dentistry', name: 'Dental Care', bg: 'bg-surface-container-high', fg: 'text-primary' },
              { icon: 'visibility', name: 'Eye Care', bg: 'bg-surface-container-high', fg: 'text-primary' },
              { icon: 'child_care', name: 'Pediatrics', bg: 'bg-surface-container-high', fg: 'text-primary' },
              { icon: 'dermatology', name: 'Dermatology', bg: 'bg-surface-container-high', fg: 'text-primary' }
            ].map((cat) => (
              <div key={cat.name} className="flex-none w-32 h-36 bg-surface-container-lowest rounded-2xl p-md flex flex-col items-center justify-center text-center shadow-sm border border-transparent hover:border-secondary transition-all cursor-pointer">
                <div className={`w-12 h-12 rounded-full ${cat.bg} flex items-center justify-center mb-sm`}>
                  <span className={`material-symbols-outlined ${cat.fg}`}>{cat.icon}</span>
                </div>
                <span className="text-[14px] font-bold text-on-surface">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Doctor Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-xl">
          {doctors.map(doctor => (
            <div key={doctor.name} className="doctor-card bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col h-full group">
              <div className="relative h-48 overflow-hidden bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-[64px] text-primary/20">person</span>
                <div className="absolute top-md right-md bg-white/90 backdrop-blur-md px-sm py-1 rounded-lg flex items-center gap-xs font-bold text-primary text-[14px]">
                  <span className="material-symbols-outlined text-yellow-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  4.8
                </div>
              </div>
              <div className="p-lg flex flex-col flex-1">
                <div className="mb-md">
                  <h3 className="text-[20px] font-bold text-on-surface">{doctor.name}</h3>
                  <p className="text-secondary font-bold text-[14px]">{doctor.specialization}</p>
                </div>
                <div className="space-y-sm text-[16px] text-on-surface-variant flex-1">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-outline text-[20px]">apartment</span>
                    <span>{doctor.location}</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-outline text-[20px]">schedule</span>
                    <span>{doctor.experience_years} Years Experience</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-outline text-[20px]">payments</span>
                    <span className="font-bold text-on-surface">$120 / Consultation</span>
                  </div>
                </div>
                <div className="mt-lg pt-lg border-t border-outline-variant flex gap-md">
                  <button className="flex-1 bg-secondary text-on-secondary py-md rounded-xl font-bold transition-all hover:-translate-y-[2px] hover:shadow-lg" onClick={() => openBookingModal(doctor)}>
                    Book Appointment
                  </button>
                  <button className="w-12 h-12 flex items-center justify-center border border-outline-variant rounded-xl text-primary hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined">info</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Booking Modal Overlay */}
      {modalDoctor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="flex justify-between items-center p-lg border-b border-outline-variant bg-surface-container-low">
              <div>
                <h2 className="text-[20px] font-bold text-primary">Book an Appointment</h2>
                <p className="text-[14px] font-bold text-on-surface-variant">{modalDoctor?.name}</p>
              </div>
              <button className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors p-sm" onClick={closeBookingModal}>close</button>
            </div>
            
            <div className="p-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                {/* Calendar View Simulation */}
                <div>
                  <label className="text-[14px] font-bold text-primary mb-md block">Select Date</label>
                  <div className="bg-surface rounded-2xl p-md border border-outline-variant">
                    <div className="flex justify-between items-center mb-md">
                      <span className="font-bold text-[16px] text-on-surface">June 2026</span>
                      <div className="flex gap-sm">
                        <button className="material-symbols-outlined text-outline hover:bg-surface-container p-1 rounded">chevron_left</button>
                        <button className="material-symbols-outlined text-outline hover:bg-surface-container p-1 rounded">chevron_right</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 text-center text-[12px] font-bold text-outline mb-sm">
                      <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>
                    <div className="grid grid-cols-7 text-center gap-y-2 text-[14px]">
                      {['14','15','16','17'].map(d => <div key={'prev'+d} className="py-2 text-outline-variant">{d}</div>)}
                      {['18','19','20','21','22','23','24','25'].map(d => (
                        <div key={d} onClick={() => setSelectedDate(d)} className={`py-2 rounded-lg cursor-pointer font-bold ${selectedDate === d ? 'bg-secondary text-on-secondary' : 'hover:bg-surface-container-high'}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="text-[14px] font-bold text-primary mb-md block">Available Time Slots</label>
                  <div className="grid grid-cols-2 gap-sm">
                    {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'].map(time => (
                      <button 
                        key={time}
                        onClick={() => time !== '04:00 PM' && setSelectedTime(time)}
                        className={`py-md border rounded-xl font-bold transition-all text-[14px]
                          ${time === '04:00 PM' ? 'opacity-50 cursor-not-allowed bg-surface-container line-through border-outline-variant' 
                          : selectedTime === time ? 'border-secondary bg-secondary-container text-on-secondary-container ring-2 ring-secondary ring-offset-2' 
                          : 'border-outline-variant hover:border-secondary hover:bg-secondary-container'}
                        `}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-xl p-lg bg-surface rounded-2xl border border-outline-variant flex items-start gap-md">
                <span className="material-symbols-outlined text-secondary">info</span>
                <div className="text-[14px]">
                  <p className="font-bold text-primary">Insurance Verification</p>
                  <p className="text-on-surface-variant mt-1">Your policy (ID: #88210) is accepted by this clinic. No additional co-pay required today.</p>
                </div>
              </div>
            </div>

            <div className="p-lg bg-surface-container-low border-t border-outline-variant flex flex-col md:flex-row gap-md items-center justify-between">
              <p className="text-[12px] font-bold text-on-surface-variant max-w-xs">By booking, you agree to our 24-hour cancellation policy and privacy terms.</p>
              <button className="w-full md:w-auto px-2xl py-md bg-secondary text-on-secondary rounded-xl font-bold flex items-center justify-center gap-md hover:scale-[1.02] transition-all" onClick={confirmBooking}>
                Confirm Appointment
                <span className="material-symbols-outlined">check_circle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Toast */}
      <div className={`fixed top-margin-desktop right-margin-desktop z-[100] transition-transform duration-500 ease-out ${showToast ? 'translate-x-0' : 'translate-x-[150%]'}`}>
        <div className="bg-surface-container-lowest border-l-4 border-secondary p-lg rounded-xl shadow-2xl flex items-center gap-lg max-w-sm">
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-3xl">task_alt</span>
          </div>
          <div>
            <p className="font-bold text-[16px] text-primary">Booking Confirmed!</p>
            <p className="text-[14px] text-on-surface-variant mt-1">We've sent the details to your email and added it to your calendar.</p>
          </div>
          <button className="material-symbols-outlined text-outline hover:text-on-surface ml-auto" onClick={() => setShowToast(false)}>close</button>
        </div>
      </div>
    </Layout>
  );
};

export default DoctorBooking;
