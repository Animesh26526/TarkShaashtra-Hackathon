import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Printer,
  MessageSquare,
  Sparkles,
  Brain,
  Tag,
  Zap,
  Target,
  Cloud,
  ArrowRight,
  Volume2,
  X
} from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 'listen', label: 'Listening to audio...', icon: Volume2, color: '#6366f1' },
  { id: 'transcribe', label: 'Transcribing speech...', icon: Brain, color: '#8b5cf6' },
  { id: 'classify', label: 'Classifying category...', icon: Tag, color: '#0ea5e9' },
  { id: 'priority', label: 'Determining priority...', icon: Zap, color: '#f59e0b' },
  { id: 'resolve', label: 'Generating resolution guide...', icon: Target, color: '#10b981' },
  { id: 'sync', label: 'Syncing to cloud...', icon: Cloud, color: '#1d4ed8' },
  { id: 'done', label: 'Complete!', icon: CheckCircle2, color: '#10b981' },
];

const AgenticMode = ({ onContinueAsText }) => {
  const [phase, setPhase] = useState('idle'); // idle, recording, processing, result, error
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const iframeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(blob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setPhase('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.');
      setPhase('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const processAudio = async (audioBlob) => {
    setPhase('processing');
    setCurrentStep(0);

    // Simulate pipeline progression while API processes
    const stepTimers = [];
    for (let i = 1; i < PIPELINE_STEPS.length - 1; i++) {
      stepTimers.push(
        new Promise(resolve => setTimeout(() => {
          setCurrentStep(i);
          resolve();
        }, i * 1200))
      );
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/agentic/resolve', {
        method: 'POST',
        body: formData,
      });

      // Wait for all visual steps to finish
      await Promise.all(stepTimers);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      const data = await response.json();
      setCurrentStep(PIPELINE_STEPS.length - 1);
      
      setTimeout(() => {
        setResult(data);
        setPhase('result');
      }, 800);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleContinueAsText = () => {
    if (onContinueAsText && result) {
      onContinueAsText({
        title: result.complaint?.title || '',
        description: result.transcript || '',
        category: result.analysis?.category || '',
        priority: result.analysis?.priority || '',
      });
    }
  };

  const reset = () => {
    setPhase('idle');
    setCurrentStep(-1);
    setResult(null);
    setError(null);
    setRecordingTime(0);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="agentic-mode">
      <AnimatePresence mode="wait">
        {/* ─── IDLE STATE ─── */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="idle-state"
          >
            <div className="agentic-hero">
              <div className="hero-icon-wrap">
                <div className="hero-icon-ring" />
                <div className="hero-icon">
                  <Sparkles size={40} />
                </div>
              </div>
              <h2>Agentic Resolution Mode</h2>
              <p>
                Speak your issue aloud. Resolvo AI will listen, analyze, and generate a 
                <strong> visual troubleshooting guide</strong> — all autonomously.
              </p>
              <button className="record-btn pulse" onClick={startRecording}>
                <Mic size={24} />
                <span>Start Recording</span>
              </button>
              <p className="hint">Your audio is processed securely via Gemma AI</p>
            </div>
          </motion.div>
        )}

        {/* ─── RECORDING STATE ─── */}
        {phase === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="recording-state"
          >
            <div className="recording-visual">
              <div className="recording-ring r1" />
              <div className="recording-ring r2" />
              <div className="recording-ring r3" />
              <div className="recording-icon">
                <Mic size={36} />
              </div>
            </div>
            <h2>Listening...</h2>
            <p className="recording-timer">{formatTime(recordingTime)}</p>
            <p className="recording-hint">Describe your issue clearly. Click stop when done.</p>
            <button className="stop-btn" onClick={stopRecording}>
              <MicOff size={20} />
              <span>Stop Recording</span>
            </button>
          </motion.div>
        )}

        {/* ─── PROCESSING STATE ─── */}
        {phase === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="processing-state"
          >
            <h2>AI Agent Working...</h2>
            <p>Resolvo is autonomously resolving your issue</p>
            <div className="pipeline">
              {PIPELINE_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === currentStep;
                const isDone = idx < currentStep;
                return (
                  <motion.div
                    key={step.id}
                    className={`pipeline-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                    initial={{ opacity: 0.3, x: -10 }}
                    animate={{
                      opacity: isDone || isActive ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    <div
                      className="step-icon"
                      style={{
                        background: isDone || isActive ? `${step.color}18` : '#f1f5f9',
                        color: isDone || isActive ? step.color : '#94a3b8',
                        borderColor: isActive ? step.color : 'transparent',
                      }}
                    >
                      {isDone ? <CheckCircle2 size={20} /> : isActive ? <Loader2 size={20} className="spin" /> : <StepIcon size={20} />}
                    </div>
                    <div className="step-info">
                      <span className="step-label" style={{ color: isDone || isActive ? '#1e293b' : '#94a3b8' }}>
                        {step.label}
                      </span>
                    </div>
                    {isDone && <CheckCircle2 size={16} color="#10b981" className="step-check" />}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── RESULT STATE ─── */}
        {phase === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="result-state"
          >
            <div className="result-header">
              <div className="result-success-icon">
                <CheckCircle2 size={28} color="#10b981" />
              </div>
              <div>
                <h2>Resolution Guide Ready</h2>
                <p>Case <strong>{result.complaint?.id}</strong> created and synced to cloud</p>
              </div>
            </div>

            {/* Analysis Summary Cards */}
            <div className="analysis-grid">
              <div className="analysis-card">
                <span className="analysis-label">Category</span>
                <span className="analysis-value cat">{result.analysis?.category}</span>
              </div>
              <div className="analysis-card">
                <span className="analysis-label">Priority</span>
                <span className={`analysis-value pri-${result.analysis?.priority?.toLowerCase()}`}>
                  {result.analysis?.priority}
                </span>
              </div>
              <div className="analysis-card">
                <span className="analysis-label">Sentiment</span>
                <span className="analysis-value">{result.analysis?.sentiment?.label}</span>
              </div>
              <div className="analysis-card">
                <span className="analysis-label">Confidence</span>
                <span className="analysis-value">{result.analysis?.confidence}</span>
              </div>
            </div>

            {/* Transcript */}
            {result.transcript && (
              <div className="transcript-block">
                <h4>Transcription</h4>
                <p>{result.transcript}</p>
              </div>
            )}

            {/* HTML Guide in iframe */}
            {result.html_guide && (
              <div className="guide-container">
                <div className="guide-header">
                  <h3>AI Troubleshooting Guide</h3>
                  <div className="guide-actions">
                    <button className="btn btn-outline btn-sm" onClick={handlePrint}>
                      <Printer size={16} />
                      <span>Print Guide</span>
                    </button>
                  </div>
                </div>
                <div className="guide-iframe-wrapper">
                  <iframe
                    ref={iframeRef}
                    srcDoc={result.html_guide}
                    title="Troubleshooting Guide"
                    className="guide-iframe"
                    sandbox="allow-same-origin allow-popups"
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="result-actions">
              <button className="btn btn-outline" onClick={reset}>
                <Mic size={18} />
                <span>New Recording</span>
              </button>
              <button className="btn btn-primary continue-btn" onClick={handleContinueAsText}>
                <MessageSquare size={18} />
                <span>Not Satisfied? Continue as Text</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── ERROR STATE ─── */}
        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="error-state"
          >
            <AlertCircle size={48} color="#ef4444" />
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={reset}>Try Again</button>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .agentic-mode {
          max-width: 900px;
          margin: 0 auto;
          min-height: 500px;
        }

        /* ── Idle ── */
        .idle-state { text-align: center; padding: 2rem 0; }

        .agentic-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .hero-icon-wrap {
          position: relative;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-icon-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #0ea5e9, #10b981);
          opacity: 0.15;
          animation: ringPulse 3s ease-in-out infinite;
        }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.15); opacity: 0.25; }
        }

        .hero-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
        }

        .agentic-hero h2 {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #1e293b, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .agentic-hero p {
          color: var(--text-muted);
          max-width: 480px;
          line-height: 1.6;
          font-size: 1rem;
        }

        .record-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2.5rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 9999px;
          font-size: 1.125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
          margin-top: 0.5rem;
        }

        .record-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
        }

        .record-btn.pulse {
          animation: btnPulse 2.5s ease-in-out infinite;
        }

        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 4px 30px rgba(99, 102, 241, 0.5); }
        }

        .hint {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 0.5rem;
        }

        /* ── Recording ── */
        .recording-state {
          text-align: center;
          padding: 3rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .recording-visual {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .recording-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid #ef4444;
          animation: recordRing 2s ease-in-out infinite;
        }

        .r1 { inset: 0; animation-delay: 0s; }
        .r2 { inset: -15px; animation-delay: 0.5s; opacity: 0.6; }
        .r3 { inset: -30px; animation-delay: 1s; opacity: 0.3; }

        @keyframes recordRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        .recording-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: recBlink 1.5s ease-in-out infinite;
        }

        @keyframes recBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .recording-state h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ef4444;
        }

        .recording-timer {
          font-family: 'SF Mono', 'Cascadia Code', 'Courier New', monospace;
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: 0.05em;
        }

        .recording-hint {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .stop-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: #1e293b;
          color: white;
          border: none;
          border-radius: 9999px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stop-btn:hover {
          background: #0f172a;
          transform: translateY(-1px);
        }

        /* ── Processing ── */
        .processing-state {
          text-align: center;
          padding: 2rem 0;
        }

        .processing-state h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .processing-state > p {
          color: var(--text-muted);
          margin-bottom: 2.5rem;
        }

        .pipeline {
          max-width: 500px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pipeline-step {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1.25rem;
          border-radius: var(--radius-md);
          background: white;
          border: 1px solid var(--border);
          transition: all 0.3s;
        }

        .pipeline-step.active {
          background: #fafafe;
          border-color: #c7d2fe;
          box-shadow: 0 2px 12px rgba(99, 102, 241, 0.08);
        }

        .pipeline-step.done {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .step-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 2px solid transparent;
          transition: all 0.3s;
        }

        .step-info { flex: 1; text-align: left; }

        .step-label {
          font-size: 0.875rem;
          font-weight: 600;
          transition: color 0.3s;
        }

        .step-check { flex-shrink: 0; }

        .spin { animation: spin 1s linear infinite; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ── Result ── */
        .result-state {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
          border: 1px solid #bbf7d0;
          border-radius: var(--radius-lg);
        }

        .result-success-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #d1fae5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .result-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.125rem;
        }

        .result-header p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .analysis-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-align: center;
        }

        .analysis-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .analysis-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }

        .analysis-value.cat { color: #6366f1; }
        .analysis-value.pri-high { color: #ef4444; }
        .analysis-value.pri-medium { color: #f59e0b; }
        .analysis-value.pri-low { color: #10b981; }

        .transcript-block {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .transcript-block h4 {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          letter-spacing: 0.04em;
        }

        .transcript-block p {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: #334155;
          font-style: italic;
        }

        /* Guide */
        .guide-container {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .guide-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          background: #f8fafc;
        }

        .guide-header h3 {
          font-size: 1rem;
          font-weight: 700;
        }

        .guide-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-sm {
          padding: 0.375rem 0.875rem;
          font-size: 0.8125rem;
          gap: 0.375rem;
        }

        .guide-iframe-wrapper {
          width: 100%;
          background: white;
        }

        .guide-iframe {
          width: 100%;
          min-height: 500px;
          border: none;
          display: block;
        }

        /* Actions */
        .result-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding-top: 0.5rem;
        }

        .result-actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .continue-btn {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          padding: 0.875rem 1.5rem;
          font-size: 0.9375rem;
        }

        .continue-btn:hover {
          background: linear-gradient(135deg, #4f46e5, #4338ca);
        }

        /* ── Error ── */
        .error-state {
          text-align: center;
          padding: 4rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .error-state h2 {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .error-state p {
          color: var(--text-muted);
          max-width: 400px;
        }

        @media (max-width: 768px) {
          .analysis-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .result-actions {
            flex-direction: column;
          }
          .continue-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default AgenticMode;
