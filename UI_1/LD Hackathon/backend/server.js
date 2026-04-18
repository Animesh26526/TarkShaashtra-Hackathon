import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { 
  classifyComplaint, 
  analyzeSentiment, 
  determinePriority, 
  generateResolution,
  getConfidenceAssessment,
  getSLAHours
} from './utils/resolvoEngine.js';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001; 

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the Frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// In-memory store for demo
let complaints = [
  {
    id: 'CMP-001',
    title: 'Broken seal on arrival',
    description: 'The product arrived with a broken seal. Very disappointing.',
    category: 'Packaging Issue',
    priority: 'Medium',
    status: 'Open',
    sentiment: { label: 'Angry', icon: '😠', score: 25 },
    resolution: 'Apology + Replacement',
    confidence: '94%',
    slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    attempts: 1,
    escalated: false,
    assignedTo: 'Agent Sarah'
  }
];

// Helper to simulate processing
const processComplaintData = (data) => {
  const contentToAnalyze = data.description || data.emailBody || '';
  const sentiment = analyzeSentiment(contentToAnalyze);
  const category = classifyComplaint(contentToAnalyze);
  const priority = determinePriority(contentToAnalyze, sentiment);
  const resolution = generateResolution(category);
  const confidence = getConfidenceAssessment();
  const slaHours = getSLAHours(priority);

  return {
    id: `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
    title: data.title || (data.type === 'Email' ? `Email: ${data.emailSubject}` : data.type === 'Call' ? `Call from ${data.phoneNumber}` : 'Text Complaint'),
    description: data.description || data.emailBody || 'N/A',
    type: data.type || 'Text',
    phoneNumber: data.phoneNumber || null,
    emailSubject: data.emailSubject || null,
    category,
    priority,
    status: 'Open',
    sentiment,
    resolution: resolution.action,
    resolutionExplanation: resolution.explanation,
    confidence,
    slaDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    attempts: data.attempts || 1,
    escalated: data.escalated || false,
    assignedTo: 'Auto Assigned'
  };
};

// API Endpoints
app.get('/api/complaints', (req, res) => {
  res.json(complaints);
});

app.post('/api/complaints', (req, res) => {
  const newComplaint = processComplaintData(req.body);
  complaints = [newComplaint, ...complaints];
  res.status(201).json(newComplaint);
});

app.post('/api/classify', (req, res) => {
  const { description } = req.body;
  const category = classifyComplaint(description);
  const sentiment = analyzeSentiment(description);
  const priority = determinePriority(description, sentiment);
  const confidence = getConfidenceAssessment();
  const resolution = generateResolution(category);

  res.json({
    category,
    sentiment,
    priority,
    confidence,
    resolution: resolution.action,
    explanation: resolution.explanation
  });
});

app.patch('/api/complaints/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  complaints = complaints.map(c => 
    c.id === id ? { ...c, ...updates } : c
  );
  
  const updated = complaints.find(c => c.id === id);
  res.json(updated);
});

// Catch-all to serve index.html for any non-API routes (SPA routing)
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Resolvo (Unified) running on http://localhost:${PORT}`);
});
