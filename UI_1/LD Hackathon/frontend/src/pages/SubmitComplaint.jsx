import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Mail, 
  Phone, 
  ArrowLeft, 
  Upload, 
  X, 
  CheckCircle,
  Clock,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import ComplaintTypeCard from '../components/customer/ComplaintTypeCard';
import DialPad from '../components/customer/DialPad';
import EmailSplitView from '../components/customer/EmailSplitView';
import StatusTracker from '../components/customer/StatusTracker';

const SubmitComplaint = () => {
  const { addComplaint, generateAIResponse } = useApp();
  const [step, setStep] = useState('choice'); // choice, details, success
  const [selectedType, setSelectedType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  // Text Flow State
  const [textData, setTextData] = useState({ title: '', description: '' });
  const [previewImage, setPreviewImage] = useState(null);

  // Email Flow State
  const [emailAiResponse, setEmailAiResponse] = useState(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep('details');
  };

  const handleBack = () => {
    setStep('choice');
    setSelectedType(null);
    setEmailAiResponse(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitTextComplaint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const complaint = await addComplaint({
      type: 'Text',
      ...textData,
      attachment: previewImage
    });
    setSuccessData(complaint);
    setStep('success');
    setIsSubmitting(false);
  };

  const handleEmailGenerate = async (data) => {
    setIsAiGenerating(true);
    const res = await generateAIResponse(data);
    setEmailAiResponse(res);
    setIsAiGenerating(false);
  };

  const submitEmailComplaint = async (userData, aiData) => {
    setIsSubmitting(true);
    const complaint = await addComplaint({
      type: 'Email',
      title: `Email: ${userData.subject}`,
      emailSubject: userData.subject,
      emailBody: aiData.response,
      recipient: userData.recipient,
      escalated: aiData.isEscalated
    });
    setSuccessData(complaint);
    setStep('success');
    setIsSubmitting(false);
  };

  const submitCallComplaint = async (number) => {
    setIsSubmitting(true);
    const complaint = await addComplaint({
      type: 'Call',
      phoneNumber: number,
      description: `Voicemail/Call initiated from ${number}`
    });
    setSuccessData(complaint);
    setStep('success');
    setIsSubmitting(false);
  };

  return (
    <div className="customer-interface">
      <AnimatePresence mode="wait">
        {step === 'choice' && (
          <motion.div 
            key="choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="view-container"
          >
            <div className="view-header">
              <h1>How can we help you today?</h1>
              <p>Select a channel to begin your smart resolution journey.</p>
            </div>

            <div className="type-selection-grid">
              <ComplaintTypeCard 
                title="Text Complaint" 
                icon={FileText} 
                description="Describe your issue with text and images for instant classification."
                onClick={() => handleTypeSelect('Text')}
              />
              <ComplaintTypeCard 
                title="Email Complaint" 
                icon={Mail} 
                description="Draft professional emails with Resolvo AI and track responses."
                onClick={() => handleTypeSelect('Email')}
              />
              <ComplaintTypeCard 
                title="Call Summary" 
                icon={Phone} 
                description="Summarize call interactions or use our interactive dial pad."
                onClick={() => handleTypeSelect('Call')}
              />
            </div>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="view-container"
          >
            <button className="back-btn" onClick={handleBack}>
              <ArrowLeft size={18} /> Back to Selection
            </button>

            {selectedType === 'Text' && (
              <div className="details-card card">
                <h2>New Text Complaint</h2>
                <form onSubmit={submitTextComplaint}>
                  <div className="form-group">
                    <label>Complaint Title</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g., Shipping damage on order #123"
                      value={textData.title}
                      onChange={(e) => setTextData({...textData, title: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Detailed Description</label>
                    <textarea 
                      required 
                      rows={6}
                      placeholder="Describe everything that happened..."
                      value={textData.description}
                      onChange={(e) => setTextData({...textData, description: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Upload Proof (Images only)</label>
                    <div className="upload-zone">
                      {previewImage ? (
                        <div className="image-preview">
                          <img src={previewImage} alt="Preview" />
                          <button className="remove-img" onClick={() => setPreviewImage(null)}><X size={14} /></button>
                        </div>
                      ) : (
                        <label className="upload-label">
                          <Upload size={24} />
                          <span>Click or Drag to Upload</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                        </label>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary submit-btn-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                  </button>
                </form>
              </div>
            )}

            {selectedType === 'Email' && (
              <EmailSplitView 
                isGenerating={isAiGenerating}
                onGenerate={handleEmailGenerate}
                aiResponse={emailAiResponse}
                onFinalSubmit={submitEmailComplaint}
              />
            )}

            {selectedType === 'Call' && (
              <div className="call-flow-container">
                <div className="call-info">
                  <h2>Interactive Dial Pad</h2>
                  <p>Dial your registered number or use voice input to verify your session.</p>
                </div>
                <DialPad onCall={submitCallComplaint} />
              </div>
            )}
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="success-view"
          >
            <div className="success-card card">
              <div className="check-icon">
                <CheckCircle size={48} color="var(--success)" />
              </div>
              <h1>Complaint Submitted!</h1>
              <p>Your case <strong>{successData?.id}</strong> is now being processed.</p>
              
              <div className="success-actions">
                <button className="btn btn-primary" onClick={() => {
                  window.location.reload(); // Simple way to reset state
                }}>
                  File Another Complaint
                </button>
              </div>
            </div>

            <div className="mt-8">
              <StatusTracker 
                status={successData?.status} 
                deadline={successData?.slaDeadline} 
                createdAt={successData?.createdAt}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .customer-interface {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .view-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .view-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 1rem;
          letter-spacing: -0.025em;
        }

        .view-header p {
          font-size: 1.125rem;
          color: var(--text-muted);
        }

        .type-selection-grid {
          display: flex;
          gap: 2rem;
          margin-top: 2rem;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 2rem;
          transition: color 0.2s;
        }

        .back-btn:hover {
          color: var(--primary);
        }

        .details-card {
          padding: 2.5rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .details-card h2 {
          margin-bottom: 2rem;
          font-weight: 700;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: var(--text-main);
        }

        .form-group input, .form-group textarea {
          width: 100%;
          padding: 0.875rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          background: #f8fafc;
        }

        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          transition: border-color 0.2s;
        }

        .upload-zone:hover {
          border-color: var(--primary);
        }

        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .image-preview {
          position: relative;
          height: 100%;
          padding: 10px;
        }

        .image-preview img {
          height: 100px;
          border-radius: var(--radius-md);
          object-fit: cover;
        }

        .remove-img {
          position: absolute;
          top: 0;
          right: 0;
          background: var(--danger);
          color: white;
          border: none;
          border-radius: 50%;
          padding: 4px;
        }

        .submit-btn-full {
          width: 100%;
          padding: 1rem;
          font-size: 1.125rem;
        }

        .call-flow-container {
          text-align: center;
        }

        .call-info {
          margin-bottom: 2rem;
        }

        .call-info h2 { font-weight: 700; margin-bottom: 0.5rem; }
        .call-info p { color: var(--text-muted); }

        .success-view {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }

        .success-card {
          padding: 3.5rem;
        }

        .check-icon {
          margin-bottom: 1.5rem;
        }

        .success-card h1 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .success-card p {
          color: var(--text-muted);
          margin-bottom: 2.5rem;
        }

        .mt-8 { margin-top: 2rem; }

        @media (max-width: 768px) {
          .type-selection-grid { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default SubmitComplaint;
