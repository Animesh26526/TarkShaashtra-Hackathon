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
  const { user, userRole, getAuthHeaders } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, []);

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/appwrite/complaints`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      // Normalize Appwrite schema to frontend schema
      const normalizedComplaints = (data.complaints || [])
        .filter(c => (c.text || c.title || c.description || c.complaint_id)) // Relaxed ghost filter
        .map(c => {
          let sentimentScore = 50;
          if (typeof c.sentiment === 'number') {
            sentimentScore = c.sentiment <= 1 ? (c.sentiment + 1) * 50 : c.sentiment;
          } else if (c.sentiment && typeof c.sentiment.score === 'number') {
            sentimentScore = c.sentiment.score <= 1 ? (c.sentiment.score + 1) * 50 : c.sentiment.score;
          }

          const scoreValue = Math.max(0, Math.min(100, typeof sentimentScore === 'number' ? sentimentScore : 50));
          const sentimentLabel = scoreValue < 40 ? 'Angry' : (scoreValue > 70 ? 'Happy' : 'Neutral');
          const sentimentIcon = scoreValue < 40 ? '😠' : (scoreValue > 70 ? '😊' : '😐');

          return {
            ...c,
            id: c.complaint_id || c.id || c.$id || 'N/A',
            title: c.title || c.text || 'Untitled Complaint',
            description: c.text || c.description || '',
            status: c.status || (c.resolution_time > 0 ? 'Resolved' : 'Open'),
            assignedTo: c.assignedTo || c.assigned_to || 'Resolvo AI Agent',
            createdAt: c.$createdAt || c.createdAt || new Date().toISOString(),
            slaDeadline: c.sla_deadline || c.slaDeadline || new Date().toISOString(),
            resolutionTime: c.resolution_time || 0,
            sentiment: {
              score: scoreValue,
              label: sentimentLabel,
              icon: sentimentIcon
            }
          };
        });

      setComplaints(normalizedComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      // Ensure we don't have a totally empty screen if we can help it
      if (complaints.length === 0) setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/stats`, { headers });
      if (!response.ok) return;
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addComplaint = async (data) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit complaint');
      }
      const newComplaint = await response.json();
      setComplaints(prev => [newComplaint, ...prev]);
      await Promise.all([fetchStats(), fetchComplaints()]);
      return newComplaint;
    } catch (error) {
      console.error('Error adding complaint:', error);
      throw error; // Re-throw to allow component-level handling
    }
  };

  const updateComplaintStatus = async (id, newStatus) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      const updated = await response.json();
      
      // Update local state immediately with the robust response
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updated, id: id } : c));
      
      // Force sync stats and list to ensure dashboard is accurate
      await Promise.all([fetchStats(), fetchComplaints()]);
      return updated;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  const escalateComplaint = async (id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'Escalated', escalated: true })
      });
      if (!response.ok) throw new Error('Failed to escalate');
      const updated = await response.json();
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updated, id: id } : c));
      await Promise.all([fetchStats(), fetchComplaints()]);
      return updated;
    } catch (error) {
      console.error('Error escalating:', error);
      throw error;
    }
  };

  const deleteComplaint = async (id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!response.ok) throw new Error('Failed to delete');
      
      // Remove from state immediately
      setComplaints(prev => prev.filter(c => c.id !== id));
      
      // Sync with server and Appwrite
      await Promise.all([fetchStats(), fetchComplaints()]);
    } catch (error) {
      console.error('Error deleting:', error);
      throw error;
    }
  };

  const classifyText = async (description) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/classify`, {
        method: 'POST',
        headers,
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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
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
        isEscalated: parsed?.should_escalate || false,
        isResolved: parsed?.is_resolved || false,
        response: parsed?.reply || result.content ||
          `Dear ${data.recipient || 'Customer'},\n\nWe have received your concerns regarding "${data.emailSubject || data.subject || 'the issue'}" and we sincerely apologize for the inconvenience. Our team has analyzed the issue using AI-powered classification and we are prioritizing its resolution within the next 24-48 hours.\n\nBest regards,\nResolvo Support Team`
      };
    } catch (error) {
      console.error('AI response error:', error);
      return {
        isEscalated: false,
        isResolved: false,
        response: `Dear ${data.recipient || 'Customer'},\n\nThank you for reaching out. We are reviewing your complaint and will respond within our SLA timeframe.\n\nBest regards,\nResolvo Support Team`
      };
    }
  };

  return (
    <AppContext.Provider value={{
      userRole,
      complaints,
      stats,
      addComplaint,
      updateComplaintStatus,
      escalateComplaint,
      deleteComplaint,
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
