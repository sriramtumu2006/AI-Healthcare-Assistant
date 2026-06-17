import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';

const MedicalRecordsChat = () => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [records, setRecords] = useState([]);
  
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const recs = await api.get('/records/my-records');
        setRecords(recs);
        
        const convs = await api.get('/conversations');
        let currentConv = convs.length > 0 ? convs[0] : null;
        if (!currentConv) {
          currentConv = await api.post('/conversations', { title: "Medical Assistant Chat" });
        }
        setConversationId(currentConv.id);
        
        const details = await api.get(`/conversations/${currentConv.id}`);
        if (details.messages.length === 0) {
            setMessages([{ sender: 'ai', text: "Hello! I am your AI assistant. I can help you understand your medical records.", citations: null }]);
        } else {
            setMessages(details.messages.map(m => ({
                sender: m.role === 'user' ? 'user' : 'ai',
                text: m.content,
                citations: null
            })));
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;
    
    const userMsg = { sender: 'user', text: input, citations: null };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const data = await api.post(`/conversations/${conversationId}/messages`, { content: userMsg.text });
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: data.content,
        citations: null
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: err.message || "Failed to communicate with AI.",
        citations: null
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
          const token = api.getToken();
          const response = await fetch('http://localhost:8000/records/upload', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
          });
          if (!response.ok) throw new Error("Upload failed");
          const newRecord = await response.json();
          setRecords(prev => [newRecord, ...prev]);
      } catch(err) {
          alert('Upload failed: ' + err.message);
      }
  };

  return (
    <Layout>
      <main className="lg:ml-64 pt-20 pb-20 lg:pb-8 px-margin-mobile md:px-margin-desktop min-h-screen">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-lg">
          
          {/* Left Column: Upload & Records */}
          <div className="xl:col-span-8 space-y-lg">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-md">
              <div>
                <h1 className="text-headline-lg font-headline-lg text-[32px] text-primary font-bold">Medical Records</h1>
                <p className="text-on-surface-variant max-w-lg text-[16px]">Manage your health history. Our AI securely indexes your documents to provide personalized health insights.</p>
              </div>
            </header>

            {/* Upload Section */}
            <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center text-center hover:border-secondary transition-colors group relative cursor-pointer">
              <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.png,.jpeg" />
              <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-md group-hover:bg-secondary-container transition-colors">
                <span className="material-symbols-outlined text-secondary text-3xl">cloud_upload</span>
              </div>
              <h3 className="text-[20px] font-bold text-on-surface">Upload New Documents</h3>
              <p className="text-on-surface-variant text-[14px] mt-xs">PDF, JPG, or PNG up to 20MB. Reports are encrypted and private.</p>
              <div className="mt-lg flex gap-md">
                <button className="px-lg py-sm bg-secondary text-on-secondary rounded-lg font-bold flex items-center gap-xs">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Select Files
                </button>
              </div>
            </div>

            {/* Records List: Bento Grid style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              
              {records.map(record => (
                <div key={record.id} className="bg-surface-container-lowest p-md rounded-xl shadow-sm border border-transparent hover:border-outline-variant transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-md">
                    <div className="flex items-center gap-sm">
                      <div className="w-10 h-10 bg-surface-container-low rounded-lg flex items-center justify-center group-hover:bg-secondary-container transition-colors">
                        <span className="material-symbols-outlined text-primary">description</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[14px] text-on-surface max-w-[150px] truncate" title={record.file_name}>{record.file_name}</h4>
                        <p className="text-[12px] text-on-surface-variant">{new Date(record.uploaded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="bg-primary-fixed text-on-primary-fixed-variant text-[10px] px-sm py-xs rounded-full font-bold uppercase tracking-wider">Indexed</span>
                  </div>
                  <div className="flex gap-sm mt-md">
                    <button className="text-[12px] text-secondary font-bold flex items-center gap-xs hover:underline"><span className="material-symbols-outlined text-sm">visibility</span> View</button>
                    <button className="text-[12px] text-on-surface-variant font-bold flex items-center gap-xs hover:underline"><span className="material-symbols-outlined text-sm">download</span> Download</button>
                  </div>
                </div>
              ))}

              <div className="bg-surface-container p-md rounded-xl border border-dashed border-outline-variant flex items-center justify-center gap-sm text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-all cursor-pointer">
                <span className="material-symbols-outlined">add_circle</span>
                <span className="font-bold text-[16px]">Add Another Provider</span>
              </div>

            </div>

            {/* Recent Activity/Insights */}
            <section className="mt-2xl">
              <h2 className="text-[20px] font-bold text-primary mb-md">Key Trends from Records</h2>
              <div className="bg-surface-container-low rounded-2xl p-lg grid grid-cols-1 md:grid-cols-3 gap-lg overflow-hidden relative">
                
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Cholesterol</span>
                  <div className="flex items-end gap-xs mt-xs">
                    <span className="text-[32px] font-bold text-primary">185</span>
                    <span className="text-[16px] text-on-surface mb-xs">mg/dL</span>
                  </div>
                  <span className="text-[12px] text-secondary flex items-center gap-xs mt-xs font-bold">
                    <span className="material-symbols-outlined text-xs">trending_down</span>
                    5% lower than last year
                  </span>
                </div>

                <div className="flex flex-col border-l border-outline-variant md:pl-lg">
                  <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Blood Pressure</span>
                  <div className="flex items-end gap-xs mt-xs">
                    <span className="text-[32px] font-bold text-primary">118/75</span>
                    <span className="text-[16px] text-on-surface mb-xs">mmHg</span>
                  </div>
                  <span className="text-[12px] text-on-surface-variant flex items-center gap-xs mt-xs font-bold">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    Stable & Optimal
                  </span>
                </div>

                <div className="flex flex-col border-l border-outline-variant md:pl-lg">
                  <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Vitamin D3</span>
                  <div className="flex items-end gap-xs mt-xs">
                    <span className="text-[32px] font-bold text-error">24</span>
                    <span className="text-[16px] text-on-surface mb-xs">ng/mL</span>
                  </div>
                  <span className="text-[12px] text-error flex items-center gap-xs mt-xs font-bold">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    Below normal range
                  </span>
                </div>

              </div>
            </section>
          </div>

          {/* Right Column: AI RAG Sidebar */}
          <aside className="xl:col-span-4 h-full">
            <div className="sticky top-24 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col h-[calc(100vh-120px)]">
              {/* AI Header */}
              <div className="p-lg border-b border-outline-variant bg-surface-container-low rounded-t-2xl">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-on-secondary shadow-md">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <h2 className="text-[20px] font-bold text-primary">Ask Your Records</h2>
                    <p className="text-[12px] text-on-surface-variant">AI-powered medical history search</p>
                  </div>
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-grow overflow-y-auto p-lg space-y-lg custom-scrollbar" ref={chatRef}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-sm ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`${msg.sender === 'user' ? 'bg-surface-container-high rounded-tr-none' : 'bg-primary/5 rounded-tl-none border border-primary/10'} p-md rounded-2xl max-w-[90%] text-[14px] text-on-surface shadow-sm whitespace-pre-wrap`}>
                      {msg.text}
                      
                      {msg.citations && msg.citations.map((cite, idx) => (
                        <div key={idx} className="mt-md p-sm bg-surface-container-lowest border border-secondary/20 rounded-lg text-[12px] italic">
                          <div className="flex items-center gap-xs text-secondary font-bold mb-xs">
                            <span className="material-symbols-outlined text-[14px]">format_quote</span>
                            Excerpt from {cite.doc}
                          </div>
                          "{cite.text}"
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {isThinking && (
                  <div className="flex items-center gap-xs p-md bg-primary/5 border border-primary/10 rounded-2xl rounded-tl-none w-fit">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{animationDelay: "0s"}}></div>
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{animationDelay: "0.4s"}}></div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-lg border-t border-outline-variant">
                <div className="relative">
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl p-md pr-12 text-[14px] focus:ring-2 focus:ring-secondary focus:border-transparent outline-none resize-none h-20 transition-all custom-scrollbar" 
                    placeholder="Ask about medications, lab values..."
                  ></textarea>
                  <button 
                    onClick={handleSend}
                    className="absolute bottom-3 right-3 w-8 h-8 bg-secondary text-on-secondary rounded-lg flex items-center justify-center shadow hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
                <div className="mt-md flex flex-wrap gap-xs">
                  <button onClick={() => setInput('Compare blood panels')} className="px-sm py-1 bg-surface-container-high border border-outline-variant rounded-full text-[10px] font-bold text-on-surface-variant hover:bg-secondary-container hover:text-secondary transition-colors">Compare blood panels</button>
                  <button onClick={() => setInput('List current prescriptions')} className="px-sm py-1 bg-surface-container-high border border-outline-variant rounded-full text-[10px] font-bold text-on-surface-variant hover:bg-secondary-container hover:text-secondary transition-colors">List current prescriptions</button>
                </div>
              </div>
            </div>
          </aside>
          
        </div>
      </main>
    </Layout>
  );
};

export default MedicalRecordsChat;
