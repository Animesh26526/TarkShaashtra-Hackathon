import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Activity, Loader2, StopCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

const MOCK_CONVERSATION = [
  "Resolvo AI: Hello! Thank you for calling Resolvo support. How can I help you today?",
  "Customer: Hi, I'm calling about batch #402. The seals on the last 5 bottles were loose and leaking in the carton.",
  "Resolvo AI: I'm very sorry to hear that. Leaking bottles in batch #402 is definitely a quality concern. Could you confirm if the carton itself was wet?",
  "Customer: Yes, it was completely soaked. It made quite a mess in our storage area.",
  "Resolvo AI: Understood. I've noted the soak damage. I am registering this as a priority packaging issue. We will initiate a full replacement for that batch immediately."
];

const LiveD2DSession = ({ onFinish }) => {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, simulated
  const [transcript, setTranscript] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const outputAudioQueue = useRef([]);
  const isPlayingRef = useRef(false);
  const simIntervalRef = useRef(null);

  const [errorMsg, setErrorMsg] = useState('');

  // Local STT to capture user's side
  const startLocalSTT = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Browser does not support SpeechRecognition. Falling back to AI-only transcript.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let latest = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          latest += event.results[i][0].transcript;
        }
      }
      if (latest) {
        setTranscript(prev => prev + (prev ? "\n" : "") + "Customer: " + latest);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Local STT failed to start:", e);
    }
  };

  const startSimulation = () => {
    setStatus('simulated');
    setIsSimulating(true);
    setTranscript('');
    setErrorMsg('');
    
    let index = 0;
    simIntervalRef.current = setInterval(() => {
      if (index < MOCK_CONVERSATION.length) {
        setTranscript(prev => prev + (prev ? "\n" : "") + MOCK_CONVERSATION[index]);
        index++;
      } else {
        clearInterval(simIntervalRef.current);
        setTimeout(() => stopSession(true), 1000);
      }
    }, 2000);
  };

  const connectToGemini = async () => {
    if (!GEMINI_API_KEY) {
      setErrorMsg("No API Key detected. Please provide VITE_GEMINI_API_KEY or use Simulation Mode.");
      return;
    }

    setStatus('connecting');
    setTranscript('');
    setErrorMsg('');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: { responseModalities: ["AUDIO"] },
          systemInstruction: {
            parts: [{ text: "You are a Resolvo AI Customer Support Agent. You handle live packaged water bottle complaints via audio. Extract the category, sentiment, and priority. Only respond in concise sentences." }]
          }
        }
      }));
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        if (event.data instanceof Blob) {
          const text = await event.data.text();
          data = JSON.parse(text);
        } else {
          data = JSON.parse(event.data);
        }
      } catch (e) { return; }

      if (data.error) {
        setErrorMsg(`API Error: ${data.error.message || "Unauthorized Caller"}`);
        stopSession();
        return;
      }

      if (data.setupComplete) {
        setStatus('connected');
        startMicrophone();
        startLocalSTT();
      } else if (data.serverContent?.modelTurn) {
        const parts = data.serverContent.modelTurn.parts;
        for (const p of parts) {
          if (p.text) setTranscript(prev => prev + (prev ? "\n" : "") + "Resolvo AI: " + p.text);
          if (p.inlineData && p.inlineData.data) queueOutputAudio(p.inlineData.data);
        }
      }
    };

    ws.onerror = () => {
      setErrorMsg("WebSocket connection error. Check your API Key configuration.");
      stopSession();
    };

    ws.onclose = (e) => {
      if (e.code === 1008) {
        setErrorMsg("Unregistered Caller (1008): Establish identity via VITE_GEMINI_API_KEY.");
      } else if (e.code !== 1000) {
        setErrorMsg(`WebSocket disconnected (Code: ${e.code})`);
      }
      stopSession();
    };
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 }});
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const channelData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(channelData.length);
          for (let i = 0; i < channelData.length; i++) {
            let s = Math.max(-1, Math.min(1, channelData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          const uint8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
          wsRef.current.send(JSON.stringify({
            realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: btoa(binary) } }
          }));
        }
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (e) {
      stopSession();
    }
  };

  const queueOutputAudio = async (base64) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;

      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;
      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      outputAudioQueue.current.push(audioBuffer);
      playNextAudio();
    } catch (e) {}
  };

  const playNextAudio = () => {
    if (isPlayingRef.current || outputAudioQueue.current.length === 0) return;
    isPlayingRef.current = true;
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    const buffer = outputAudioQueue.current.shift();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };
    source.start();
  };

  const stopSession = (isAuto = false) => {
    if (wsRef.current) wsRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (processorRef.current) processorRef.current.disconnect();
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setStatus('disconnected');

    if (transcript.trim().length > 0) {
      onFinish(transcript, isSimulating);
    } else if (!isAuto) {
      setErrorMsg("No speech detected. Please check your microphone and try again.");
    }
  };

  useEffect(() => { return () => { 
    if (wsRef.current) wsRef.current.close();
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
  }; }, []);

  return (
    <div className="hackathon-live-wrapper">
      <div className="audio-control-panel">
        <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center'}}>
          <h2 style={{margin:0, color:'var(--primary)'}}>{isSimulating ? 'Simulated AI Call' : 'Gemini 3.1 Live Audio'}</h2>
          {isSimulating && <span className="badge" style={{background:'#fef3c7', color:'#92400e', border:'1px solid #f59e0b'}}>SIMULATION MODE</span>}
        </div>
        
        <div className="status-header">
          {errorMsg && <div style={{color:'#ef4444', marginBottom:'0.5rem', fontWeight:500}}>{errorMsg}</div>}
          {status === 'disconnected' && <span>Ready to start support session</span>}
          {status === 'connecting' && <span className="processing"><Loader2 size={16} className="spin" /> Connecting...</span>}
          {status === 'connected' && <span className="pulsing-record"><span className="dot"></span> Live Bidi Stream Active</span>}
          {status === 'simulated' && <span className="pulsing-record" style={{color:'#9333ea'}}><span className="dot" style={{background:'#9333ea'}}></span> Generating Mock Transcript...</span>}
        </div>

        <div className="controls">
          {status === 'disconnected' ? (
            <div style={{display:'flex', gap:'1rem'}}>
              <button className="btn-circle start-btn" title="Start Live Audio" onClick={connectToGemini}><Mic size={24} /></button>
              <button className="btn-circle" style={{background:'#9333ea'}} title="Run Simulation" onClick={startSimulation}><Activity size={24} /></button>
            </div>
          ) : (
            <button className="btn-circle stop-btn" onClick={() => stopSession(false)}><StopCircle size={24} /></button>
          )}
        </div>

        {(status === 'connected' || status === 'simulated') && (
          <div style={{ width: '100%', marginTop: '1rem', background:'#f8fafc', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border)' }}>
            <p style={{marginBottom: '0.5rem', fontWeight:'600', color:'var(--text-muted)', fontSize:'0.75rem', textTransform:'uppercase'}}>Transcript Feed:</p>
            <p style={{whiteSpace:'pre-wrap', fontSize:'0.95rem', lineHeight:1.5}}>{transcript || "Waiting for audio input..."}</p>
          </div>
        )}
      </div>

      <style>{`
        .hackathon-live-wrapper { padding: 1rem; width: 100%; max-width: 700px; margin: 0 auto; display: flex; flexDirection: column; gap: 1.5rem; }
        .audio-control-panel { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; background: #fff; padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .status-header { text-align: center; font-weight: 600; color: var(--text-muted); font-size: 0.9rem; min-height: 24px; }
        .pulsing-record { color: var(--success); display: flex; align-items: center; gap: 0.5rem; justify-content:center; }
        .dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; animation: pulse 1s infinite; }
        .processing { display: flex; align-items: center; gap: 0.5rem; color: var(--primary); justify-content:center; }
        .spin { animation: spin 1s linear infinite; }
        .controls { display: flex; gap: 1.5rem; }
        .btn-circle { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: white; transition: all 0.2s; }
        .start-btn { background: var(--primary); }
        .stop-btn { background: var(--danger); animation: breathe 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        @keyframes breathe { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LiveD2DSession;
