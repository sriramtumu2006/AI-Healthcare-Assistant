import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

const SymptomChecker = () => {
  const [step, setStep] = useState(1);
  const [isThinking, setIsThinking] = useState(false);
  const [progress, setProgress] = useState(15);
  const chatContainerRef = useRef(null);

  // Form states
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Select');
  const [symptom, setSymptom] = useState('');
  const [duration, setDuration] = useState('Just started');
  const [severity, setSeverity] = useState(5);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [step, isThinking, result]);

  const handleNextStep = (nextStepNum) => {
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      setStep(nextStepNum);
      if (nextStepNum === 2) setProgress(45);
      if (nextStepNum === 3) setProgress(75);
    }, 1200);
  };

  const handleRunAnalysis = async () => {
    setIsThinking(true);
    setProgress(100);
    try {
      const sevString = severity > 7 ? 'severe' : severity > 3 ? 'moderate' : 'mild';
      const data = await api.post('/symptom/analyze', {
        symptoms: symptom,
        duration,
        severity: sevString
      });
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to run analysis");
    } finally {
      setIsThinking(false);
      setStep('complete');
    }
  };

  return (
    <Layout>
      <main className="flex-1 lg:ml-64 p-margin-mobile md:p-margin-desktop bg-background pt-24 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-lg">
          
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
            <div>
              <h1 className="text-headline-lg font-headline-lg text-[32px] text-primary font-bold">Symptom Checker</h1>
              <p className="text-body-md text-[16px] text-on-surface-variant">Describe how you're feeling and I'll help you navigate the next steps.</p>
            </div>
            <div className="flex items-center gap-sm bg-surface p-sm rounded-xl border border-outline-variant">
              <span className="text-[12px] font-bold text-outline">ASSESSMENT PROGRESS</span>
              <div className="w-32 h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-secondary transition-all duration-700" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Bento Layout for Chat and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            
            {/* Left Column: Conversational AI */}
            <div className="lg:col-span-8 flex flex-col h-[650px] bg-white rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="p-md border-b border-outline-variant/30 flex items-center gap-sm bg-surface-container-low rounded-t-2xl">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">smart_toy</span>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-on-surface">Triagely Assistant</h3>
                  <div className="flex items-center gap-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-[10px] text-outline font-bold">ONLINE & SECURE</span>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-md space-y-lg scroll-smooth custom-scrollbar" ref={chatContainerRef}>
                
                {/* Step 1 */}
                <div className="flex gap-sm max-w-[85%]">
                  <div className="chat-bubble-ai p-md text-on-surface text-[16px]">
                    Hello! I'm here to help you understand your symptoms. To provide an accurate assessment, I'll need a few details. Please start by telling me your age and gender.
                  </div>
                </div>
                <div className="flex flex-col items-end gap-sm">
                  <div className={`chat-bubble-user p-md border border-outline-variant w-full md:w-2/3 ${step > 1 ? 'opacity-70 pointer-events-none' : ''}`}>
                    <h4 className="text-[14px] font-bold mb-md text-primary">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-md">
                      <div className="space-y-xs">
                        <label className="text-[12px] font-bold text-outline">Age</label>
                        <input value={age} onChange={e => setAge(e.target.value)} className="w-full p-sm rounded-lg border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none" placeholder="e.g. 28" type="number"/>
                      </div>
                      <div className="space-y-xs">
                        <label className="text-[12px] font-bold text-outline">Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full p-sm rounded-lg border border-outline-variant focus:border-secondary outline-none">
                          <option>Select</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Non-binary</option>
                        </select>
                      </div>
                    </div>
                    {step === 1 && (
                      <button className="mt-md w-full bg-secondary text-on-secondary font-bold py-sm rounded-lg hover:opacity-90 transition-opacity" onClick={() => handleNextStep(2)}>Confirm Details</button>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                {step >= 2 && (
                  <>
                    <div className="flex gap-sm max-w-[85%] mt-lg animate-fade-in">
                      <div className="chat-bubble-ai p-md text-on-surface text-[16px]">
                        Thank you. Now, please describe your main symptom and how long you've been experiencing it.
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-sm mt-md">
                      <div className={`chat-bubble-user p-md border border-outline-variant w-full md:w-2/3 ${step > 2 ? 'opacity-70 pointer-events-none' : ''}`}>
                        <h4 className="text-[14px] font-bold mb-md text-primary">Symptom Details</h4>
                        <div className="space-y-md">
                          <div className="space-y-xs">
                            <label className="text-[12px] font-bold text-outline">Main Symptom</label>
                            <input value={symptom} onChange={e => setSymptom(e.target.value)} type="text" placeholder="e.g. Headache, Nausea" className="w-full p-sm rounded-lg border border-outline-variant outline-none focus:border-secondary" />
                          </div>
                          <div className="space-y-xs">
                            <label className="text-[12px] font-bold text-outline">Duration</label>
                            <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-sm rounded-lg border border-outline-variant outline-none focus:border-secondary">
                              <option>Just started</option>
                              <option>1-3 days</option>
                              <option>About a week</option>
                              <option>More than a month</option>
                            </select>
                          </div>
                        </div>
                        {step === 2 && (
                          <button onClick={() => handleNextStep(3)} className="mt-md w-full bg-secondary text-on-secondary font-bold py-sm rounded-lg">Continue</button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Step 3 */}
                {step >= 3 && (
                  <>
                    <div className="flex gap-sm max-w-[85%] mt-lg">
                      <div className="chat-bubble-ai p-md text-on-surface text-[16px]">
                        Almost done. On a scale of 1-10, how severe is your discomfort?
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-sm mt-md">
                      <div className={`chat-bubble-user p-md border border-outline-variant w-full md:w-2/3 ${step === 'complete' ? 'opacity-70 pointer-events-none' : ''}`}>
                        <h4 className="text-[14px] font-bold mb-md text-primary">Severity Scale</h4>
                        <input value={severity} onChange={e => setSeverity(e.target.value)} type="range" min="1" max="10" className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-secondary" />
                        <div className="flex justify-between text-[10px] font-bold text-outline mt-xs px-1">
                          <span>MILD (1)</span>
                          <span>MODERATE (5)</span>
                          <span>SEVERE (10)</span>
                        </div>
                        {step === 3 && (
                          <button onClick={handleRunAnalysis} className="mt-md w-full bg-secondary text-on-secondary font-bold py-sm rounded-lg">Run Analysis</button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Thinking state */}
                {isThinking && (
                  <div className="flex gap-sm items-center py-sm">
                    <div className="flex gap-xs">
                      <div className="thinking-dot"></div>
                      <div className="thinking-dot"></div>
                      <div className="thinking-dot"></div>
                    </div>
                    <span className="text-[12px] font-bold text-outline">Analysing clinical data...</span>
                  </div>
                )}
              </div>

              {/* Chat Input (Disabled for multi-step) */}
              <div className="p-md border-t border-outline-variant/30 flex gap-sm bg-surface-container-lowest rounded-b-2xl">
                <input disabled className="flex-1 p-sm rounded-full bg-surface border border-outline-variant/50 focus:outline-none focus:ring-1 focus:ring-secondary/50" placeholder="Type a symptom (e.g., headache, back pain)..." type="text"/>
                <button disabled className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white opacity-50">
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>

            {/* Right Column: Contextual Info & Quick Actions */}
            <div className="lg:col-span-4 space-y-lg">
              <div className="bg-white p-lg rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="font-bold text-[20px] text-primary mb-md">Current Focus</h3>
                  <div className="space-y-md">
                    <div className="flex items-center justify-between p-sm bg-surface-container rounded-lg">
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-secondary">vital_signs</span>
                        <span className="font-bold text-[14px]">Vital Indicators</span>
                      </div>
                      <span className="text-[12px] text-secondary font-bold">STABLE</span>
                    </div>
                    <div className="p-md bg-secondary/5 rounded-lg border border-secondary/20">
                      <p className="text-[12px] font-bold text-on-surface-variant">The AI is monitoring for red-flag symptoms. Please answer as accurately as possible.</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-lg opacity-10">
                  <span className="material-symbols-outlined text-[96px] text-secondary">monitor_heart</span>
                </div>
              </div>

              {/* Recommendations Card */}
              <div className="bg-white p-lg rounded-2xl shadow-sm border border-outline-variant/30">
                <h3 className="font-bold text-[20px] text-primary mb-md">Quick Recommendations</h3>
                <div className="space-y-md">
                  {step === 'complete' ? (
                    <>
                      <div className="p-sm bg-surface rounded-lg flex items-center gap-md border border-outline-variant/30">
                        <span className="material-symbols-outlined text-secondary">pill</span>
                        <div>
                          <p className="text-[14px] font-bold">Medical Attention Recommended</p>
                          <p className="text-[10px] font-bold text-outline">Consider seeing a specialist</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-md animate-pulse">
                        <div className="w-12 h-12 rounded-full skeleton-shimmer"></div>
                        <div className="flex-1 space-y-xs py-2">
                          <div className="h-4 w-3/4 skeleton-shimmer rounded"></div>
                          <div className="h-3 w-1/2 skeleton-shimmer rounded"></div>
                        </div>
                      </div>
                      <p className="text-[11px] text-outline italic mt-lg">Recommendations will appear once symptoms are detailed.</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-error-container p-lg rounded-2xl border border-error/20">
                <div className="flex items-center gap-md text-on-error-container">
                  <span className="material-symbols-outlined">emergency_home</span>
                  <h4 className="font-bold">Feeling very unwell?</h4>
                </div>
                <p className="text-[12px] font-bold text-on-error-container/80 mt-sm">If you're experiencing chest pain or difficulty breathing, call 911 immediately.</p>
                <button className="mt-md w-full bg-white text-error font-bold py-sm rounded-lg border border-error/30 shadow-sm">View ER Locations</button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {step === 'complete' && result && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg pt-lg animate-fade-in">
              <div className="md:col-span-2 bg-white p-2xl rounded-3xl shadow-lg border-2 border-secondary/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-xl gap-md">
                  <div>
                    <h2 className="text-[32px] font-bold text-primary tracking-tight">Assessment Result</h2>
                    <p className="text-[16px] text-on-surface-variant">Based on the symptoms described.</p>
                  </div>
                  <div className="bg-secondary-container text-on-secondary-container px-lg py-sm rounded-full font-bold text-[14px]">
                    Analysis Complete
                  </div>
                </div>
                <div className="space-y-lg">
                  {/* Triage Overview Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                    <div className="border border-outline-variant p-md rounded-xl bg-surface">
                      <span className="text-[12px] font-bold text-outline">REPORTED SEVERITY</span>
                      <div className="text-[32px] font-bold text-on-surface">{severity}/10</div>
                    </div>
                    <div className="border border-outline-variant p-md rounded-xl bg-surface-container-low">
                      <span className="text-[12px] font-bold text-outline">AI URGENCY SCORE</span>
                      <div className="text-[32px] font-bold text-primary">{result.urgency_score || severity}/10</div>
                    </div>
                    <div className="border border-outline-variant p-md rounded-xl bg-surface col-span-2">
                      <span className="text-[12px] font-bold text-outline">RISK CATEGORY</span>
                      <div className={`text-[20px] font-bold leading-tight mt-2 ${result.symptom_log?.risk_category === 'Emergency' ? 'text-error' : result.symptom_log?.risk_category === 'Urgent' ? 'text-orange-500' : 'text-primary'}`}>
                        {result.symptom_log?.risk_category || "Routine"}
                      </div>
                    </div>
                  </div>

                  {/* Possible Conditions */}
                  <div className="p-lg bg-surface rounded-2xl border border-outline-variant/30">
                    <h4 className="text-[20px] font-bold mb-md flex items-center gap-sm text-primary">
                      <span className="material-symbols-outlined text-secondary">medical_information</span>
                      Possible Conditions
                    </h4>
                    <ul className="space-y-sm">
                      {result.possible_conditions && result.possible_conditions.length > 0 ? (
                        result.possible_conditions.map((condition, idx) => (
                          <li key={idx} className="flex items-center gap-sm text-[16px] text-on-surface-variant bg-surface-container-lowest p-sm rounded-lg border border-outline-variant/50">
                            <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
                            {condition}
                          </li>
                        ))
                      ) : (
                        <li className="text-[16px] text-on-surface-variant">General symptom pattern</li>
                      )}
                    </ul>
                  </div>

                  {/* Recommended Next Actions */}
                  <div className="p-lg bg-secondary/5 rounded-2xl border border-secondary/20">
                    <h4 className="text-[20px] font-bold mb-md flex items-center gap-sm text-on-surface">
                      <span className="material-symbols-outlined text-secondary">checklist</span>
                      Recommended Next Actions
                    </h4>
                    <ul className="space-y-md">
                      {result.next_actions && result.next_actions.length > 0 ? (
                        result.next_actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-sm">
                            <div className="w-6 h-6 mt-1 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <span className="text-[16px] text-on-surface-variant leading-relaxed">{action}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-start gap-sm">
                          <span className="text-[16px] text-on-surface-variant">{result.ai_recommendation || "Consult a healthcare professional."}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                {result.emergency_alert && (
                  <div className="mt-xl p-md bg-error-container text-on-error-container rounded-xl border-l-4 border-error">
                    <p className="text-[14px] font-bold">
                      {result.alert_message}
                    </p>
                  </div>
                )}
                <div className="mt-xl p-md bg-surface-container-low rounded-xl border-l-4 border-primary">
                  <p className="text-[13px] text-on-surface-variant italic">
                    <strong>Disclaimer:</strong> {result.disclaimer || "This is for informational purposes only. Always seek the advice of a qualified healthcare provider."}
                  </p>
                </div>
              </div>

              <div className="space-y-lg">
                <h3 className="font-bold text-[20px] text-primary">Recommended Specialist</h3>
                <div className="bg-surface-container-low p-md rounded-xl border border-secondary/30 flex flex-col gap-sm">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary text-[24px]">stethoscope</span>
                    <span className="font-bold text-[16px] text-on-surface">{result.recommended_specialist || "General Physician"}</span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant">Based on your symptoms, this is the most appropriate medical professional to consult.</p>
                </div>
                
                <h3 className="font-bold text-[18px] text-primary mt-xl">Suggested Doctors</h3>
                <div className="bg-white p-md rounded-xl shadow-sm border border-outline-variant flex gap-md items-center group cursor-pointer hover:border-secondary transition-colors" onClick={() => window.location.href='/doctors'}>
                  <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden">
                     <img src={`https://ui-avatars.com/api/?name=${result.recommended_specialist}&background=random`} alt="Specialist" className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface group-hover:text-secondary">Find a {result.recommended_specialist || "Doctor"}</h4>
                    <p className="text-[12px] font-bold text-outline">Available nearby</p>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-outline group-hover:text-secondary">arrow_forward</span>
                </div>
                
                <button onClick={() => window.location.href='/doctors'} className="w-full py-md bg-primary text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-sm hover:opacity-90">
                  <span className="material-symbols-outlined">calendar_month</span>
                  Book Consultation
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && error && (
            <div className="p-lg bg-error-container text-on-error-container rounded-2xl font-bold">
              {error}
            </div>
          )}

        </div>
      </main>
    </Layout>
  );
};

export default SymptomChecker;
