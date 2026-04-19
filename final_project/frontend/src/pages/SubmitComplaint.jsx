import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Mail, Phone, Users, Send, AlertTriangle, CheckCircle, RefreshCw, Bot, User, PhoneCall, Delete } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import LiveD2DSession from '../components/customer/LiveD2DSession';
import AgenticMode from '../components/customer/AgenticMode';

const SubmitComplaint = () => {
  const { generateAIResponse, addComplaint } = useApp();
  const [view, setView] = useState('selection'); // selection, text_init, text_chat, email, call, live
  const [sessionComplaint, setSessionComplaint] = useState(null);

  // Text Flow State
  const [directDesc, setDirectDesc] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const endOfChatRef = useRef(null);

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleStartTextChat = async (e) => {
    e.preventDefault();
    if (!directDesc.trim()) return;
    setIsTyping(true);
    
    // Initial complaint creation (ID generation)
    const c = await addComplaint({
      type: 'Text', title: 'Direct Issue', description: directDesc
    });
    setSessionComplaint(c);
    
    setChatMessages([
      { role: 'assistant', content: `Complaint ${c.id} logged. How else can I help resolve this issue?` }
    ]);
    setView('text_chat');
    setIsTyping(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput.trim() };
    const history = [...chatMessages, userMsg];
    setChatMessages(history);
    setChatInput('');
    setIsTyping(true);

    try {
      const aiResult = await generateAIResponse({ body: userMsg.content, history });
      setChatMessages(prev => [...prev, { 
        role: 'assistant', content: aiResult.response, isEscalated: aiResult.isEscalated 
      }]);
    } catch(e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'System error' }]);
    }
    setIsTyping(false);
  };

  // Dial Pad State
  const [dialNumber, setDialNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callResponse, setCallResponse] = useState('');

  const handleCallSubmit = async () => {
    if (!dialNumber) return;
    setIsCalling(true);
    setCallResponse('');
    try {
      const res = await fetch('/api/phone-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digits: dialNumber })
      });
      const data = await res.json();
      setCallResponse(data.reply || 'System Error');
      // Create a complaint for the call
      await addComplaint({ type: 'Call', title: `Call to ${dialNumber}`, description: data.reply });
    } catch (e) {
      setCallResponse('Failed to connect call.');
    }
    setIsCalling(false);
  };

  return (
    <div className="submit-page">
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1>Receive Complaint</h1>
          <p style={{color:'var(--text-muted)'}}>Select the channel to interact and document the customer issue.</p>
        </div>
        {view !== 'selection' && (
          <button className="btn btn-outline" onClick={() => { setView('selection'); setSessionComplaint(null); }}>
            &larr; Back to Channels
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'selection' && (
          <motion.div key="selection" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="channel-grid">
            <div className="channel-card" onClick={() => setView('text_init')}>
              <div className="icon-wrap" style={{background:'#eff6ff', color:'#1d4ed8'}}><MessageSquare size={32} /></div>
              <h3>Text / Direct</h3>
              <p>Standard text-based entry system and interactive chatbot.</p>
            </div>
            <div className="channel-card" onClick={() => setView('email')}>
              <div className="icon-wrap" style={{background:'#fcf5ff', color:'#9333ea'}}><Mail size={32} /></div>
              <h3>Email Interaction</h3>
              <p>Simulate tracking rules and AI drafting for email channels.</p>
            </div>
            <div className="channel-card" onClick={() => setView('call')}>
              <div className="icon-wrap" style={{background:'#fff7ed', color:'#ea580c'}}><Phone size={32} /></div>
              <h3>Phone Call</h3>
              <p>Simulate voice Dial Pad parsing rules for call centers.</p>
            </div>
            <div className="channel-card" onClick={() => setView('live')}>
              <div className="icon-wrap" style={{background:'#f0fdf4', color:'#16a34a'}}><Users size={32} /></div>
              <h3>Live Audio (D2D)</h3>
              <p>True WebSockets with BidiGenerateContent.</p>
            </div>
            <div className="channel-card" onClick={() => setView('agentic')}>
              <div className="icon-wrap" style={{background:'#f3e8ff', color:'#9333ea'}}><Bot size={32} /></div>
              <h3>Agentic Mode</h3>
              <p>Speak your issue. AI autonomously resolves it and generates a visual guide.</p>
            </div>
          </motion.div>
        )}

        {view === 'text_init' && (
          <motion.div key="text_init" initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{opacity:0}}>
            <div className="card" style={{maxWidth:'600px', margin:'0 auto'}}>
              <h2 style={{marginBottom:'0.5rem'}}>Direct Complaint Entry</h2>
              <p style={{color:'var(--text-muted)', marginBottom:'1.5rem'}}>Provide the preliminary situation summary.</p>
              <form onSubmit={handleStartTextChat}>
                <textarea 
                  value={directDesc} onChange={(e) => setDirectDesc(e.target.value)}
                  placeholder="Describe the issue... (e.g. Broken packaging on batch #4)"
                  rows={4} required
                  style={{width:'100%', padding:'0.75rem', border:'1px solid var(--border)', borderRadius:'8px', marginBottom:'1rem'}}
                />
                <button type="submit" className="btn btn-primary" style={{width:'100%'}} disabled={isTyping}>
                  {isTyping ? 'Generating ID...' : 'Submit & Initialize Agent'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {view === 'text_chat' && (
          <motion.div key="text_chat" initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="card chat-view" style={{display:'flex', flexDirection:'column', height:'calc(100vh - 200px)'}}>
            <div style={{padding:'1rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                <span className="badge" style={{background:'var(--primary)', color:'white'}}>Tracking: {sessionComplaint?.id}</span>
                <span className="badge priority-high" style={{cursor:'pointer'}} onClick={() => alert('Connecting to a human agent... Please wait.')}>Escalate to Human</span>
                <span className="badge" style={{background:'#e2e8f0', color:'#1e293b', cursor:'pointer'}} onClick={()=>setView('selection')}>Close Case</span>
              </div>
            </div>
            
            <div className="chat-messages" style={{flex:1, overflowY:'auto', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.5rem', background:'#f8fafc'}}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{display:'flex', gap:'1rem', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth:'80%'}}>
                  {msg.role === 'assistant' && <div className="avatar"><Bot size={16}/></div>}
                  <div style={{padding:'1rem', borderRadius:'12px', background: msg.role === 'user' ? 'var(--primary)' : 'white', color: msg.role === 'user' ? 'white' : 'inherit', border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none'}}>
                    <p style={{margin:0}}>{msg.content}</p>
                    {msg.isEscalated && <div style={{marginTop:'0.5rem', fontSize:'0.75rem', color:'red'}}><AlertTriangle size={12}/> AI recommends manual escalation</div>}
                  </div>
                </div>
              ))}
              {isTyping && <div style={{display:'flex', gap:'1rem'}}>
                <div className="avatar"><Bot size={16}/></div>
                <div style={{padding:'1rem', borderRadius:'12px', background:'white', border:'1px solid var(--border)'}}>...</div>
              </div>}
              <div ref={endOfChatRef} />
            </div>

            <div style={{padding:'1rem', background:'white', borderTop:'1px solid var(--border)', display:'flex', gap:'0.5rem'}}>
              <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} style={{flex:1, padding:'0.75rem', borderRadius:'2rem', border:'1px solid var(--border)', outline:'none'}} placeholder="Type follow-up to customer..." />
              <button className="btn btn-primary" onClick={handleSendChat} style={{borderRadius:'50%', width:'42px', height:'42px', padding:0, display:'flex', alignItems:'center', justifyContent:'center'}}><Send size={18}/></button>
            </div>
          </motion.div>
        )}

        {view === 'email' && (
          <motion.div key="email" initial={{y:20, opacity:0}} animate={{y:0, opacity:1}}>
            <div style={{display:'flex', gap:'1.5rem'}}>
              <div className="card" style={{flex:1}}>
                <h3 style={{marginBottom:'1rem', paddingBottom:'0.5rem', borderBottom:'1px solid var(--border)'}}>Compose Email</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                  <div><label style={{fontSize:'0.8rem', fontWeight:600}}>To:</label><input type="text" style={{width:'100%', padding:'0.5rem', border:'1px solid var(--border)'}} placeholder="Customer Email" /></div>
                  <div><label style={{fontSize:'0.8rem', fontWeight:600}}>Subject:</label><input type="text" style={{width:'100%', padding:'0.5rem', border:'1px solid var(--border)'}} placeholder="Subject" /></div>
                  <textarea placeholder="Describe issue or reply..." rows={8} style={{width:'100%', padding:'0.5rem', border:'1px solid var(--border)'}}></textarea>
                  <button className="btn btn-outline" style={{width:'fit-content'}}>Draft with AI</button>
                </div>
              </div>
              <div className="card" style={{flex:1, background:'#f8fafc'}}>
                <h3 style={{marginBottom:'1rem', paddingBottom:'0.5rem', borderBottom:'1px solid var(--border)'}}>AI-Generated Draft</h3>
                <div style={{color:'var(--text-muted)', textAlign:'center', marginTop:'3rem'}}>
                  <Bot size={48} style={{margin:'0 auto 1rem', opacity:0.5}}/>
                  <p>AI Draft Assistant</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'call' && (
          <motion.div key="call" initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{opacity:0}}>
            <div className="card" style={{maxWidth:'400px', margin:'0 auto', textAlign:'center', padding:'2rem'}}>
              <h2 style={{marginBottom:'2rem'}}>Call Summary Sandbox</h2>
              <div style={{background:'#1e293b', padding:'1.5rem', borderRadius:'12px', color:'white', marginBottom:'2rem'}}>
                <div style={{fontSize:'2rem', letterSpacing:'4px', fontFamily:'monospace', minHeight:'3rem'}}>{dialNumber || '---'}</div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem', marginBottom:'2rem'}}>
                {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => (
                  <button key={n} onClick={() => setDialNumber(d => d + n)} style={{padding:'1rem', fontSize:'1.25rem', borderRadius:'8px', border:'1px solid var(--border)', background:'white', cursor:'pointer'}}>{n}</button>
                ))}
              </div>
              <div style={{display:'flex', justifyContent:'center', gap:'2rem'}}>
                <button disabled={isCalling} onClick={handleCallSubmit} style={{width:'64px', height:'64px', borderRadius:'50%', background:'var(--success)', border:'none', color:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><PhoneCall size={28}/></button>
                <button onClick={() => setDialNumber(d => d.slice(0,-1))} style={{width:'64px', height:'64px', borderRadius:'50%', background:'white', border:'1px solid var(--border)', color:'var(--text-main)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Delete size={28}/></button>
              </div>
              
              {isCalling && <div style={{marginTop:'2rem', color:'var(--text-muted)'}}><RefreshCw className="spin" size={24}/> Dialing...</div>}
              {callResponse && (
                <div style={{marginTop:'2rem', padding:'1rem', background:'#f8fafc', borderRadius:'8px', border:'1px solid var(--border)', textAlign:'left'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem', color:'var(--primary)'}}>
                    <Bot size={18}/> <strong>Resolvo Voice Agent</strong>
                  </div>
                  <p style={{fontSize:'0.9rem', color:'var(--text-main)'}}>{callResponse}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'live' && (
          <motion.div key="live" initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{opacity:0}}>
             <LiveD2DSession onComplaintSubmit={async (d) => {
               const c = await addComplaint(d);
               setSessionComplaint(c);
             }} />
          </motion.div>
        )}

        {view === 'agentic' && (
          <motion.div key="agentic" initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{opacity:0}}>
             <AgenticMode onContinueAsText={(data) => {
               setDirectDesc(data.description || data.title || '');
               setView('text_init');
             }} />
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`
        .channel-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .channel-card { background: white; padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border); box-shadow: var(--shadow-sm); cursor: pointer; transition: all 0.2s; text-align: center; }
        .channel-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--primary); }
        .icon-wrap { width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; }
        .channel-card h3 { margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700; color: var(--text-main); }
        .channel-card p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin: 0; }
        .avatar { width: 32px; height: 32px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
      `}</style>
    </div>
  );
};

export default SubmitComplaint;
