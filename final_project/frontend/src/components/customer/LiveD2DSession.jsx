import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Activity, Loader2, StopCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

const LiveD2DSession = ({ onComplaintSubmit }) => {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const outputAudioQueue = useRef([]);
  const isPlayingRef = useRef(false);

  const [errorMsg, setErrorMsg] = useState('');

  const connectToGemini = async () => {
    setStatus('connecting');
    setTranscript('');
    setResult(null);
    setErrorMsg('');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Setup payload for the Live Preview model
      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"]
          },
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
      } catch (e) {
        console.error("Failed to parse", e);
        return;
      }

      // Check if server sent a top-level error before disconnecting
      if (data.error) {
        setErrorMsg(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
        return;
      }

      if (data.setupComplete) {
        setStatus('connected');
        startMicrophone();
      } else if (data.serverContent?.modelTurn) {
        const parts = data.serverContent.modelTurn.parts;
        for (const p of parts) {
          if (p.text) {
            setTranscript(prev => prev + " " + p.text);
          }
          if (p.inlineData && p.inlineData.data) {
            queueOutputAudio(p.inlineData.data);
          }
        }
      }
    };

    ws.onerror = (e) => {
      setErrorMsg("WebSocket connection error occurred.");
      stopSession();
    };

    ws.onclose = (e) => {
      if (e.code !== 1000) {
        setErrorMsg(`WebSocket closed ${e.code} ${e.reason ? ': ' + e.reason : ''}`);
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
          for (let i = 0; i < uint8.byteLength; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const b64 = btoa(binary);

          wsRef.current.send(JSON.stringify({
            realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: b64 } }
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (e) {
      console.error("Mic error:", e);
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
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000); // Output sample rate is 24kHz for Gemini Gen
      audioBuffer.getChannelData(0).set(float32Array);
      outputAudioQueue.current.push(audioBuffer);
      playNextAudio();
    } catch (e) {
      console.error("Audio playback error:", e);
    }
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

  const stopSession = () => {
    if (wsRef.current) wsRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (processorRef.current) processorRef.current.disconnect();
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
    setStatus('disconnected');

    // Assume some transcript generated to process
    if (transcript.trim().length > 0) {
      setResult({
        transcript: transcript,
        category: 'Product', // Stub - in a full implementation the model's structure output turns into this
        priority: 'High',
        mood: -0.5
      });
    }
  };

  useEffect(() => {
    return () => { stopSession(); };
  }, []);

  return (
    <div className="hackathon-live-wrapper">
      {!result ? (
        <div className="audio-control-panel">
          <h2 style={{margin:0, color:'var(--primary)'}}>gemini-3.1-flash-live Bidi WebSocket API</h2>
          
          <div className="status-header">
            {errorMsg && <div style={{color:'red', marginBottom:'0.5rem'}}>{errorMsg}</div>}
            {status === 'disconnected' && <span>Ready to open WebSockets</span>}
            {status === 'connecting' && <span className="processing"><Loader2 size={16} className="spin" /> Connecting to Gemini Live...</span>}
            {status === 'connected' && <span className="pulsing-record"><span className="dot"></span> Live Bidi Stream Active</span>}
          </div>

          <div className="controls">
            {status === 'disconnected' ? (
              <button className="btn-circle start-btn" onClick={connectToGemini}><Mic size={24} /></button>
            ) : (
              <button className="btn-circle stop-btn" onClick={stopSession}><StopCircle size={24} /></button>
            )}
          </div>

          {status === 'connected' && (
            <div style={{ width: '100%', marginTop: '1rem', background:'#f8fafc', padding:'1rem', borderRadius:'8px' }}>
              <p style={{marginBottom: '0.5rem', fontWeight:'600', color:'var(--text-muted)'}}>Live AI Transcript:</p>
              <p>{transcript || "Speak to start streaming PCM..."}</p>
            </div>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="audio-result-panel">
          <h3><Activity size={18} /> Call Concluded</h3>
          <p><strong>Transcript:</strong> {result.transcript}</p>
          <button className="btn btn-primary" onClick={() => onComplaintSubmit({
            type: 'Audio', category: result.category, priority: result.priority, description: result.transcript
          })}>Finalize Log</button>
        </motion.div>
      )}

      <style>{`
        .hackathon-live-wrapper { padding: 1rem; width: 100%; max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
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
        .audio-result-panel { background: white; padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border); }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        @keyframes breathe { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LiveD2DSession;
