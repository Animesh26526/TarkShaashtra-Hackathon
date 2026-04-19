import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext();

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

export const ROLES = {
  EXECUTIVE: 'Customer Support Executive',
  QA: 'Quality Assurance Team',
  MANAGER: 'Operations Manager'
};

export const AppProvider = ({ children }) => {
  const { user } = useAuth();

  const [userRole, setUserRole] = useState(() => {
    // Priority: Appwrite prefs > localStorage > default
    return user?.prefs?.role || localStorage.getItem('resolvo_role') || ROLES.EXECUTIVE;
  });
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('resolvo_role', userRole);
  }, [userRole]);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, []);

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/appwrite/complaints`);
      const data = await response.json();

      // Normalize Appwrite schema to frontend schema
      const normalizedComplaints = (data.complaints || []).map(c => {
        let sentimentScore = 50;
        if (typeof c.sentiment === 'number') {
          // If Appwrite returns e.g. 0.8 or 80.0, normalize it to 0-100 scale.
          sentimentScore = c.sentiment <= 1 ? c.sentiment * 100 : c.sentiment;
        } else if (c.sentiment && typeof c.sentiment.score === 'number') {
          sentimentScore = c.sentiment.score;
        }

        const sentimentLabel = sentimentScore < 40 ? 'Angry' : (sentimentScore > 70 ? 'Happy' : 'Neutral');
        const sentimentIcon = sentimentScore < 40 ? '😠' : (sentimentScore > 70 ? '😊' : '😐');

        return {
          ...c,
          id: c.complaint_id || c.$id || 'N/A',
          title: c.text || c.title || 'Untitled Complaint',
          description: c.text || c.description || '',
          status: c.status || (c.resolution_time > 0 ? 'Resolved' : 'Open'),
          assignedTo: c.assignedTo || 'Resolvo AI Agent',
          createdAt: c.$createdAt || c.createdAt || new Date().toISOString(),
          resolutionTime: c.resolution_time || 0,
          sentiment: {
            score: sentimentScore,
            label: sentimentLabel,
            icon: sentimentIcon
          }
        };
      });

      setComplaints(normalizedComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addComplaint = async (data) => {
    try {
      const response = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const newComplaint = await response.json();
      setComplaints(prev => [newComplaint, ...prev]);
      fetchStats();
      return newComplaint;
    } catch (error) {
      console.error('Error adding complaint:', error);
    }
  };

  const updateComplaintStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await response.json();
      setComplaints(prev => prev.map(c => c.id === id ? updated : c));
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const escalateComplaint = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Escalated', escalated: true })
      });
      const updated = await response.json();
      setComplaints(prev => prev.map(c => c.id === id ? updated : c));
      fetchStats();
    } catch (error) {
      console.error('Error escalating:', error);
    }
  };

  const classifyText = async (description) => {
    try {
      const response = await fetch(`${API_BASE}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      return await response.json();
    } catch (error) {
      console.error('Error classifying:', error);
      return null;
    }
  };

  const generateAIResponse = async (data) => {
    try {
      const history = [
        { role: 'user', content: data.emailBody || data.description || data.body || '' }
      ];
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, model: 'gemma-4-31b-it' })
      });
      const result = await response.json();

      // If backend returned an error (all models failed), fall to static
      if (result.error) {
        console.warn('Backend AI error:', result.error);
        throw new Error(result.error);
      }

      if (result.model_used) {
        console.log(`AI response from model: ${result.model_used}`);
      }

      let parsed = null;
      try {
        const match = (result.content || '').match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch (e) { }

      const keywords = ["talk to human", "connect to agent", "human support"];
      const needsHuman = keywords.some(k =>
        (data.description || data.emailBody || data.body || '').toLowerCase().includes(k)
      );

      if (needsHuman) {
        return {
          isEscalated: true,
          response: "Connecting to human support agent. Please wait..."
        };
      }

      return {
        isEscalated: false,
        response: parsed?.reply || result.content ||
          `Dear ${data.recipient || 'Customer'},\n\nWe have received your concerns regarding "${data.emailSubject || data.subject || 'the issue'}" and we sincerely apologize for the inconvenience. Our team has analyzed the issue using AI-powered classification and we are prioritizing its resolution within the next 24-48 hours.\n\nBest regards,\nResolvo Support Team`
      };
    } catch (error) {
      console.error('AI response error:', error);
      return {
        isEscalated: false,
        response: `Dear ${data.recipient || 'Customer'},\n\nThank you for reaching out. We are reviewing your complaint and will respond within our SLA timeframe.\n\nBest regards,\nResolvo Support Team`
      };
    }
  };

  return (
    <AppContext.Provider value={{
      userRole,
      setUserRole,
      complaints,
      stats,
      addComplaint,
      updateComplaintStatus,
      escalateComplaint,
      classifyText,
      isLoading,
      fetchComplaints,
      fetchStats,
      generateAIResponse
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
