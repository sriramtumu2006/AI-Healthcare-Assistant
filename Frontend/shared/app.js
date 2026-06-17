(function () {
  const API_BASE = localStorage.getItem("healthai_api_base") || `${location.origin}`;
  const PAGE = location.pathname.toLowerCase();

  const routes = {
    login: "/frontend/unified_login_flow/code.html",
    dashboard: "/frontend/patient_dashboard/code.html",
    symptoms: "/frontend/ai_symptom_checker/code.html",
    appointments: "/frontend/doctor_search_booking/code.html",
    records: "/frontend/medical_records_rag_chat/code.html",
    profile: "/frontend/patient_registration/code.html",
    doctorDashboard: "/frontend/doctor_dashboard/code.html",
    adminDashboard: "/frontend/admin_dashboard/code.html",
  };

  const demo = {
    patient: { email: "patient@gmail.com", password: "Password123" },
    doctor: { email: "alice.smith@hospital.com", password: "Password123!" },
    admin: { email: "admin@healthai.test", password: "Password123!" },
  };

  const state = {
    selectedDoctor: null,
    selectedDate: new Date().toISOString().slice(0, 10),
    selectedTime: "10:30",
  };

  function token() {
    return localStorage.getItem("healthai_access_token");
  }

  function role() {
    return localStorage.getItem("healthai_role") || "patient";
  }

  function setSession(data) {
    localStorage.setItem("healthai_access_token", data.access_token);
    localStorage.setItem("healthai_refresh_token", data.refresh_token);
    localStorage.setItem("healthai_role", data.role);
  }

  function logout() {
    if (token()) {
      api("/auth/logout", { method: "POST" }).catch(() => {});
    }
    localStorage.removeItem("healthai_access_token");
    localStorage.removeItem("healthai_refresh_token");
    localStorage.removeItem("healthai_role");
    location.href = routes.login;
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    if (!isFormData && options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token()) {
      headers.set("Authorization", `Bearer ${token()}`);
    }

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    let payload = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const message = payload && payload.detail ? payload.detail : "Something went wrong. Please try again.";
      if (response.status === 401 && !PAGE.includes("unified_login_flow")) {
        toast("Please log in again.", "error");
        setTimeout(logout, 700);
      }
      throw new Error(Array.isArray(message) ? message.map((item) => item.msg).join(", ") : message);
    }

    return payload;
  }

  function toast(message, type = "success") {
    let host = document.getElementById("healthai-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "healthai-toast-host";
      host.className = "fixed top-6 right-6 z-[9999] flex flex-col gap-3";
      document.body.appendChild(host);
    }

    const note = document.createElement("div");
    note.className = `max-w-sm rounded-xl border p-4 shadow-2xl bg-white text-sm ${
      type === "error" ? "border-red-200 text-red-800" : "border-teal-200 text-[#00355f]"
    }`;
    note.textContent = message;
    host.appendChild(note);
    setTimeout(() => note.remove(), 4200);
  }

  function textIncludes(element, words) {
    return words.some((word) => (element.textContent || "").trim().toLowerCase().includes(word));
  }

  function wireNavigation() {
    document.querySelectorAll("a, button").forEach((element) => {
      const text = (element.textContent || "").trim().toLowerCase();
      if (!text) return;

      if (text.includes("dashboard") || text === "home" || text.includes("overview")) {
        setClick(element, () => go(role() === "doctor" ? routes.doctorDashboard : role() === "admin" ? routes.adminDashboard : routes.dashboard));
      } else if (text.includes("symptom") || text.includes("start new analysis")) {
        setClick(element, () => go(routes.symptoms));
      } else if (text.includes("appointment") || text.includes("consultation") || text.includes("care finder") || text.includes("find a clinic")) {
        setClick(element, () => go(routes.appointments));
      } else if (text.includes("record") || text.includes("chat")) {
        setClick(element, () => go(text.includes("chat") ? routes.symptoms : routes.records));
      } else if (text.includes("profile") || text.includes("settings")) {
        setClick(element, () => go(routes.profile));
      } else if (text.includes("logout")) {
        setClick(element, logout);
      } else if (text.includes("emergency") || text.includes("sos")) {
        setClick(element, () => toast("Emergency alert noted. Please call 108 or local emergency services now.", "error"));
      } else if (text.includes("help")) {
        setClick(element, () => toast("Help request received. A support workflow can be added here."));
      } else if (text.includes("notification")) {
        setClick(element, () => toast("No new notifications."));
      }
    });
  }

  function setClick(element, handler) {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      handler(event);
    });
  }

  function go(path) {
    location.href = path;
  }

  function requireAuth() {
    if (!PAGE.includes("unified_login_flow") && !token()) {
      location.href = routes.login;
    }
  }

  function wireLogin() {
    if (!PAGE.includes("unified_login_flow")) return;

    Object.entries(demo).forEach(([demoRole, creds]) => {
      const panel = document.getElementById(`panel-${demoRole}`);
      if (!panel) return;

      const inputs = panel.querySelectorAll("input");
      if (inputs[0]) {
        inputs[0].value = creds.email;
        inputs[0].placeholder = creds.email;
        const label = inputs[0].closest(".space-y-xs")?.querySelector("label");
        if (label) label.textContent = "Email Address";
      }
      if (inputs[1]) {
        inputs[1].value = creds.password;
        inputs[1].placeholder = "Password";
      }
    });

    document.querySelectorAll(".tab-content form").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const panel = form.closest(".tab-content");
        const selectedRole = panel?.id?.replace("panel-", "") || "patient";

        if (selectedRole === "admin" && !document.getElementById("admin-otp-stage")?.classList.contains("hidden")) {
          const otp = Array.from(document.querySelectorAll("#admin-otp-stage input")).map((input) => input.value).join("");
          if (otp.length && otp.length < 6) {
            toast("Enter the full 6-digit MFA code.", "error");
            return;
          }
        }

        const inputs = form.querySelectorAll("input");
        const emailInput = Array.from(inputs).find((input) => input.type === "email" || input.value.includes("@")) || inputs[0];
        const passwordInput = Array.from(inputs).find((input) => input.type === "password");
        await login(emailInput?.value || demo[selectedRole].email, passwordInput?.value || demo[selectedRole].password, selectedRole);
      });
    });

    document.querySelectorAll("button").forEach((button) => {
      if (textIncludes(button, ["register account"])) {
        setClick(button, async () => {
          const form = document.querySelector("#panel-patient form");
          const inputs = form.querySelectorAll("input");
          const email = inputs[0]?.value || demo.patient.email;
          const password = inputs[1]?.value || demo.patient.password;
          try {
            await api("/auth/register", {
              method: "POST",
              body: JSON.stringify({ email, password, role: "patient" }),
            });
            toast("Account created. Logging you in...");
            await login(email, password, "patient");
          } catch (error) {
            toast(error.message, "error");
          }
        });
      }
    });
  }

  async function login(email, password, selectedRole) {
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (selectedRole && data.role !== selectedRole) {
        toast(`Logged in as ${data.role}. Redirecting to the matching workspace.`);
      }
      setSession(data);
      go(data.role === "doctor" ? routes.doctorDashboard : data.role === "admin" ? routes.adminDashboard : routes.dashboard);
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function loadDashboard() {
    if (!PAGE.includes("patient_dashboard")) return;
    try {
      const [dashboard, profile] = await Promise.all([
        api("/dashboard"),
        api("/profile").catch(() => null),
      ]);

      const heading = document.querySelector("main h1");
      if (heading && profile?.name) heading.textContent = `Welcome back, ${profile.name.split(" ")[0]}`;

      const subtitle = document.querySelector("main h1 + p");
      if (subtitle) {
        subtitle.textContent = `${dashboard.upcoming_appointments.length} upcoming appointment(s), ${dashboard.recent_symptom_logs.length} recent symptom check(s), and ${dashboard.medical_records.length} record(s).`;
      }

      const appointmentBox = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent.includes("Upcoming Appointments"))?.closest(".md\\:col-span-8");
      if (appointmentBox) {
        appointmentBox.querySelector(".space-y-md").innerHTML = dashboard.upcoming_appointments.length
          ? dashboard.upcoming_appointments.map(renderAppointment).join("")
          : emptyState("No upcoming appointments yet.", "Book New Consultation");
      }

      const insightTitle = document.querySelector(".bg-primary h2");
      const insightBody = document.querySelector(".bg-primary p.font-body-md");
      if (insightTitle) insightTitle.textContent = "Daily health tip";
      if (insightBody) insightBody.textContent = dashboard.health_tip;

      const symptomCard = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent.includes("Symptom History"))?.closest(".md\\:col-span-5");
      if (symptomCard) {
        const latest = dashboard.recent_symptom_logs[0];
        const badge = symptomCard.querySelector(".rounded-full");
        if (badge) badge.textContent = latest ? latest.risk_category : "Clear";
        const title = symptomCard.querySelector(".p-lg p.font-bold");
        const body = symptomCard.querySelector(".p-lg p.text-label-md");
        if (title) title.textContent = latest ? `Analysis: ${latest.symptoms}` : "No symptom checks yet";
        if (body) body.textContent = latest ? `${latest.severity} severity for ${latest.duration}.` : "Start a new analysis when you need guidance.";
      }
    } catch (error) {
      toast(error.message, "error");
    }
  }

  function renderAppointment(item) {
    return `
      <div class="flex items-center gap-lg p-md rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-secondary transition-colors">
        <div class="w-16 h-16 rounded-xl bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">
          <span class="material-symbols-outlined">medical_services</span>
        </div>
        <div class="flex-1">
          <p class="text-body-md font-bold text-on-surface">${item.doctor?.name || "Doctor"}</p>
          <p class="text-label-md text-on-surface-variant">${item.doctor?.specialization || "Consultation"} - ${item.status}</p>
        </div>
        <div class="text-right">
          <p class="text-body-md font-bold text-primary">${item.date}</p>
          <p class="text-label-md text-on-surface-variant">${item.time}</p>
        </div>
        <button class="material-symbols-outlined text-outline hover:text-error" data-cancel-appointment="${item.id}">close</button>
      </div>
    `;
  }

  function emptyState(message, action) {
    return `<div class="p-lg rounded-2xl bg-surface-container-low border border-outline-variant/40 text-on-surface-variant">${message}${action ? ` <button class="text-secondary font-bold">${action}</button>` : ""}</div>`;
  }

  async function loadDoctors() {
    if (!PAGE.includes("doctor_search_booking")) return;
    const grid = document.querySelector("section.grid.grid-cols-1.md\\:grid-cols-2");
    const searchInput = document.querySelector('input[placeholder*="Cardiologist"], input[placeholder*="Smith"]');
    const searchButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent.trim().toLowerCase().includes("search"));

    async function refresh() {
      try {
        const query = searchInput?.value?.trim() || "";
        const doctors = await api(`/doctors${query ? `?specialization=${encodeURIComponent(query)}` : ""}`);
        if (grid) grid.innerHTML = doctors.map(renderDoctor).join("");
      } catch (error) {
        toast(error.message, "error");
      }
    }

    searchButton?.addEventListener("click", (event) => {
      event.preventDefault();
      refresh();
    });
    searchInput?.addEventListener("input", () => refresh());
    document.querySelectorAll(".flex-none").forEach((card) => {
      card.addEventListener("click", () => {
        if (searchInput) searchInput.value = card.textContent.trim();
        refresh();
      });
    });
    await refresh();
  }

  function renderDoctor(doctor) {
    const disabled = !doctor.available;
    return `
      <div class="doctor-card bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0px_2px_10px_rgba(15,76,129,0.05)] border border-outline-variant/30 flex flex-col h-full group">
        <div class="relative h-48 overflow-hidden bg-primary-fixed flex items-center justify-center">
          <span class="material-symbols-outlined text-primary text-7xl">medical_services</span>
          <div class="absolute top-md right-md bg-white/90 backdrop-blur-md px-sm py-1 rounded-lg flex items-center gap-xs font-bold text-primary">
            <span class="material-symbols-outlined text-yellow-500 text-[18px]" style="font-variation-settings: 'FILL' 1;">star</span>4.${doctor.id + 4} (${doctor.experience_years} yrs)
          </div>
        </div>
        <div class="p-lg flex flex-col flex-1">
          <div class="mb-md">
            <h3 class="text-title-md font-title-md text-on-surface">${doctor.name}</h3>
            <p class="text-secondary font-bold text-label-md">${doctor.specialization}</p>
          </div>
          <div class="space-y-sm text-body-md text-on-surface-variant flex-1">
            <div class="flex items-center gap-sm"><span class="material-symbols-outlined text-outline text-[20px]">apartment</span><span>${doctor.location}</span></div>
            <div class="flex items-center gap-sm"><span class="material-symbols-outlined text-outline text-[20px]">schedule</span><span>${doctor.experience_years} Years Experience</span></div>
            <div class="flex items-center gap-sm"><span class="material-symbols-outlined text-outline text-[20px]">mail</span><span>${doctor.contact}</span></div>
          </div>
          <div class="mt-lg pt-lg border-t border-outline-variant flex gap-md">
            <button class="book-btn flex-1 ${disabled ? "bg-outline-variant text-on-surface-variant" : "bg-secondary text-on-secondary"} py-md rounded-xl font-bold transition-all" ${disabled ? "disabled" : ""} data-book-doctor="${doctor.id}">${disabled ? "Unavailable" : "Book Appointment"}</button>
            <button class="w-12 h-12 flex items-center justify-center border border-outline-variant rounded-xl text-primary hover:bg-surface-container transition-colors" data-doctor-info="${doctor.id}">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async function bookAppointment() {
    if (!state.selectedDoctor) return;
    try {
      await api("/appointment/book", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: state.selectedDoctor.id,
          date: state.selectedDate,
          time: state.selectedTime,
        }),
      });
      closeNativeBookingModal();
      toast("Booking confirmed. It now appears on your dashboard.");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  function wireAppointmentDelegates() {
    if (!PAGE.includes("doctor_search_booking") && !PAGE.includes("patient_dashboard")) return;
    document.addEventListener("click", async (event) => {
      const bookButton = event.target.closest("[data-book-doctor]");
      if (bookButton) {
        const doctorId = Number(bookButton.dataset.bookDoctor);
        const doctors = await api("/doctors");
        state.selectedDoctor = doctors.find((doctor) => doctor.id === doctorId);
        const modalName = document.getElementById("modalDoctorName");
        if (modalName) modalName.textContent = state.selectedDoctor.name;
        document.getElementById("bookingModal")?.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
      }

      const cancelButton = event.target.closest("[data-cancel-appointment]");
      if (cancelButton) {
        await api(`/appointment/cancel/${cancelButton.dataset.cancelAppointment}`, { method: "DELETE" });
        toast("Appointment cancelled.");
        loadDashboard();
      }
    });

    document.querySelectorAll("#bookingModal .grid.grid-cols-7 div").forEach((day) => {
      if (/^\d+$/.test(day.textContent.trim())) {
        day.addEventListener("click", () => {
          const selected = String(day.textContent.trim()).padStart(2, "0");
          const now = new Date();
          state.selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${selected}`;
          document.querySelectorAll("#bookingModal .grid.grid-cols-7 div").forEach((el) => el.classList.remove("bg-secondary", "text-on-secondary"));
          day.classList.add("bg-secondary", "text-on-secondary");
        });
      }
    });

    document.querySelectorAll("#bookingModal .grid.grid-cols-2 button").forEach((slot) => {
      slot.addEventListener("click", () => {
        const value = slot.textContent.trim();
        if (slot.disabled || value.includes("04:00")) return;
        state.selectedTime = to24Hour(value);
        document.querySelectorAll("#bookingModal .grid.grid-cols-2 button").forEach((el) => el.classList.remove("border-secondary", "bg-secondary-container", "ring-2"));
        slot.classList.add("border-secondary", "bg-secondary-container", "ring-2");
      });
    });

    window.confirmBooking = bookAppointment;
  }

  function closeNativeBookingModal() {
    document.getElementById("bookingModal")?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  function to24Hour(value) {
    const [time, meridiem] = value.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function wireSymptomChecker() {
    if (!PAGE.includes("ai_symptom_checker")) return;
    const chatInput = document.querySelector('input[placeholder*="Type a symptom"]');
    const sendButton = chatInput?.nextElementSibling;

    async function runQuickCheck() {
      const symptoms = chatInput.value.trim();
      if (!symptoms) return;
      chatInput.value = "";
      appendChat(symptoms, "user");
      const result = await api("/symptom/analyze", {
        method: "POST",
        body: JSON.stringify({ symptoms, duration: "unspecified", severity: "moderate" }),
      });
      showSymptomResult(result);
    }

    sendButton?.addEventListener("click", (event) => {
      event.preventDefault();
      runQuickCheck().catch((error) => toast(error.message, "error"));
    });
    chatInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runQuickCheck().catch((error) => toast(error.message, "error"));
      }
    });

    window.nextStep = async function (step) {
      if (step !== "complete") {
        return window.__originalNextStep ? window.__originalNextStep(step) : null;
      }
      const inputs = Array.from(document.querySelectorAll("#chat-container input, #chat-container select"));
      const symptom = inputs.find((input) => input.placeholder?.includes("Headache"))?.value || chatInput?.value || "general discomfort";
      const duration = inputs.find((input) => input.tagName === "SELECT" && !input.closest("#step-1"))?.value || "1-3 days";
      const severityValue = document.querySelector('input[type="range"]')?.value || "5";
      const severity = Number(severityValue) >= 8 ? "severe" : Number(severityValue) >= 4 ? "moderate" : "mild";
      const result = await api("/symptom/analyze", {
        method: "POST",
        body: JSON.stringify({ symptoms: symptom, duration, severity }),
      });
      showSymptomResult(result);
    };
  }

  function appendChat(message, side) {
    const container = document.getElementById("chat-container");
    if (!container) return;
    const wrapper = document.createElement("div");
    wrapper.className = side === "user" ? "flex flex-col items-end gap-sm" : "flex gap-sm max-w-[85%]";
    wrapper.innerHTML = `<div class="${side === "user" ? "chat-bubble-user border border-outline-variant" : "chat-bubble-ai"} p-md text-on-surface text-body-md">${message}</div>`;
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
  }

  function showSymptomResult(result) {
    appendChat(result.ai_recommendation || result.alert_message || "Assessment complete.", "ai");
    const section = document.getElementById("results-section");
    if (section) {
      section.classList.remove("hidden");
      const badge = section.querySelector(".rounded-full.font-bold");
      const title = section.querySelector("h4");
      const body = section.querySelector("h4 + p");
      if (badge) badge.textContent = result.symptom_log.risk_category;
      if (title) title.innerHTML = `<span class="material-symbols-outlined text-secondary">info</span> ${result.emergency_alert ? "Emergency symptoms detected" : "Assessment saved"}`;
      if (body) body.textContent = result.ai_recommendation || result.alert_message || result.disclaimer;
      section.scrollIntoView({ behavior: "smooth" });
    }
    const recommendations = document.getElementById("recommendation-list");
    if (recommendations) {
      recommendations.innerHTML = `
        <div class="p-sm bg-surface rounded-lg flex items-center gap-md">
          <span class="material-symbols-outlined text-secondary">event</span>
          <div><p class="text-label-md font-bold">${result.emergency_alert ? "Seek urgent help" : "Book care if needed"}</p><p class="text-[10px] text-outline">${result.symptom_log.risk_category}</p></div>
        </div>
        <div class="p-sm bg-surface rounded-lg flex items-center gap-md">
          <span class="material-symbols-outlined text-secondary">history</span>
          <div><p class="text-label-md font-bold">Saved to history</p><p class="text-[10px] text-outline">${result.symptom_log.created_at}</p></div>
        </div>
      `;
    }
    toast("Symptom analysis saved.");
  }

  function wireRecordsAndChat() {
    if (!PAGE.includes("medical_records_rag_chat")) return;
    const fileInput = document.querySelector('input[type="file"]');
    const uploadButton = Array.from(document.querySelectorAll("button")).find((button) => textIncludes(button, ["upload"]));
    const chatInput = document.querySelector('input[placeholder*="Ask"], textarea[placeholder*="Ask"]');
    const sendButton = chatInput?.nextElementSibling || Array.from(document.querySelectorAll("button")).find((button) => textIncludes(button, ["send"]));

    async function refreshRecords() {
      const records = await api("/records/my-records");
      const target = Array.from(document.querySelectorAll("section, div")).find((el) => textIncludes(el, ["recent documents", "medical records"])) || document.querySelector("main");
      if (!target) return;
      let list = document.getElementById("records-list");
      if (!list) {
        list = document.createElement("div");
        list.id = "records-list";
        list.className = "mt-md space-y-sm";
        target.appendChild(list);
      }
      list.innerHTML = records.length
        ? records.map((record) => `<div class="p-md rounded-xl bg-surface-container-low border border-outline-variant">${record.file_name}<div class="text-xs text-outline">${new Date(record.uploaded_at).toLocaleString()}</div></div>`).join("")
        : `<div class="p-md rounded-xl bg-surface-container-low border border-outline-variant text-on-surface-variant">No records uploaded yet.</div>`;
    }

    uploadButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!fileInput?.files?.[0]) {
        toast("Choose a medical record file first.", "error");
        return;
      }
      const form = new FormData();
      form.append("file", fileInput.files[0]);
      await api("/records/upload", { method: "POST", body: form });
      toast("Record uploaded.");
      refreshRecords();
    });

    sendButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      const message = chatInput?.value?.trim();
      if (!message) return;
      const data = await api("/ai/chat", { method: "POST", body: JSON.stringify({ message }) });
      toast(data.reply);
      chatInput.value = "";
    });

    refreshRecords().catch(() => {});
  }

  async function wireProfile() {
    if (!PAGE.includes("patient_registration")) return;
    const form = document.querySelector("form") || document.querySelector("main");
    if (!form) return;

    if (document.getElementById("email") && document.getElementById("password")) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = document.getElementById("fullName")?.value?.trim();
        const email = document.getElementById("email")?.value?.trim();
        const password = document.getElementById("password")?.value;
        const confirmPassword = document.getElementById("confirmPassword")?.value;
        const terms = document.getElementById("terms");

        if (!name || !email || !password) {
          toast("Please complete the required registration fields.", "error");
          return;
        }
        if (password !== confirmPassword) {
          toast("Passwords do not match.", "error");
          return;
        }
        if (terms && !terms.checked) {
          toast("Please accept the terms to continue.", "error");
          return;
        }

        try {
          try {
            await api("/auth/register", {
              method: "POST",
              body: JSON.stringify({ email, password, role: "patient" }),
            });
          } catch (error) {
            if (!error.message.toLowerCase().includes("already registered")) throw error;
          }

          const session = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          setSession(session);

          try {
            await api("/profile", {
              method: "POST",
              body: JSON.stringify({ name }),
            });
          } catch (error) {
            if (error.message.toLowerCase().includes("already exists")) {
              await api("/profile", {
                method: "PUT",
                body: JSON.stringify({ name }),
              });
            } else {
              throw error;
            }
          }

          toast("Account ready. Welcome to HealthAI.");
          go(routes.dashboard);
        } catch (error) {
          toast(error.message, "error");
        }
      });
      return;
    }

    try {
      const profile = await api("/profile");
      fillProfile(profile);
    } catch {
      // A missing profile is expected for newly registered users.
    }

    const submitButton = Array.from(document.querySelectorAll("button")).find((button) => textIncludes(button, ["submit", "save", "register", "continue"]));
    submitButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      const profile = collectProfile();
      if (!profile.name) {
        toast("Please enter your name.", "error");
        return;
      }
      try {
        await api("/profile", { method: "PUT", body: JSON.stringify(profile) });
      } catch (error) {
        if (error.message.toLowerCase().includes("not found")) {
          await api("/profile", { method: "POST", body: JSON.stringify(profile) });
        } else {
          throw error;
        }
      }
      toast("Profile saved.");
      go(routes.dashboard);
    });
  }

  function fillProfile(profile) {
    const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
    const values = [profile.name, profile.date_of_birth, profile.gender, profile.height, profile.weight, profile.allergies, profile.existing_conditions];
    inputs.forEach((input, index) => {
      if (values[index] !== null && values[index] !== undefined) input.value = values[index];
    });
  }

  function collectProfile() {
    const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
    return {
      name: inputs[0]?.value || "Patient",
      date_of_birth: inputs[1]?.value || null,
      gender: inputs[2]?.value || null,
      height: inputs[3]?.value ? Number(inputs[3].value) : null,
      weight: inputs[4]?.value ? Number(inputs[4].value) : null,
      allergies: inputs[5]?.value || null,
      existing_conditions: inputs[6]?.value || null,
    };
  }

  function wireRoleDashboards() {
    if (!PAGE.includes("doctor_dashboard") && !PAGE.includes("admin_dashboard")) return;
    Promise.all([
      api("/appointment/my-appointments").catch(() => []),
      PAGE.includes("admin_dashboard") ? api("/audit/logs").catch(() => []) : Promise.resolve([]),
    ]).then(([appointments, logs]) => {
      const cards = document.querySelectorAll("p, h1, h2, h3");
      cards.forEach((element) => {
        if (element.textContent.includes("Patients") || element.textContent.includes("Appointments")) {
          element.title = `${appointments.length} appointments loaded from backend`;
        }
        if (element.textContent.includes("Audit") || element.textContent.includes("Activity")) {
          element.title = `${logs.length} audit events loaded from backend`;
        }
      });
      toast(`${appointments.length} appointments loaded.`);
    }).catch((error) => toast(error.message, "error"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.__originalNextStep = window.nextStep;
    requireAuth();
    wireNavigation();
    wireLogin();
    wireAppointmentDelegates();
    loadDashboard();
    loadDoctors();
    wireSymptomChecker();
    wireRecordsAndChat();
    wireProfile();
    wireRoleDashboards();
  });
})();
