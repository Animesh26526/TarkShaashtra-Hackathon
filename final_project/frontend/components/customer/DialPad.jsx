import React, { useState, useEffect } from 'react';
import { Phone, Delete, Mic, MicOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DialPad = ({ onCall }) => {
  const [number, setNumber] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const handleDigitClick = (digit) => {
    if (number.length < 10 || digit === '*' || digit === '#') {
      setNumber(prev => prev + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (number.length !== 10) {
      setError('❌ Invalid phone number (must be 10 digits)');
      return;
    }
    onCall(number);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Extract numbers only
      const nums = transcript.replace(/\D/g, '').slice(0, 10);
      setNumber(nums);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  return (
    <div className="dial-pad-container">
      <div className="status-bar">
        <button className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={toggleVoice}>
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>

      <div className="display-area">
        <div className={`number-display ${error ? 'error' : ''}`}>
          {number || "Enter Number"}
        </div>
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="error-msg"
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="digits-grid">
        {digits.map((d) => (
          <motion.button
            key={d}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleDigitClick(d)}
            className="digit-btn"
          >
            {d}
          </motion.button>
        ))}
      </div>

      <div className="dial-actions">
        <div style={{ width: 48 }}></div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCall}
          className="call-btn"
        >
          <Phone fill="white" size={28} />
        </motion.button>
        <button className="delete-btn" onClick={handleDelete} disabled={!number}>
          <Delete size={24} />
        </button>
      </div>

      <style jsx>{`
        .dial-pad-container {
          background: #111827;
          border-radius: 40px;
          padding: 2rem;
          width: 320px;
          margin: 0 auto;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          color: white;
        }

        .status-bar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1rem;
        }

        .voice-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .voice-btn.listening {
          background: var(--danger);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .display-area {
          text-align: center;
          margin-bottom: 2rem;
          height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .number-display {
          font-size: 2rem;
          font-weight: 300;
          letter-spacing: 2px;
          color: #e5e7eb;
        }

        .number-display.error {
          color: var(--danger);
        }

        .error-msg {
          color: var(--danger);
          font-size: 0.75rem;
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }

        .digits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .digit-btn {
          aspect-ratio: 1;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 1.5rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .digit-btn:hover {
          background: rgba(255,255,255,0.15);
        }

        .dial-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .call-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: none;
          background: #10b981;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: #9ca3af;
        }

        .delete-btn:disabled {
          opacity: 0.2;
        }
      `}</style>
    </div>
  );
};

export default DialPad;
