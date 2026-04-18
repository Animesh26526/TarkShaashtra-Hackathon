import React, { createContext, useContext, useState, useEffect } from 'react';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { Query } from 'appwrite';

const AppContext = createContext();

const API_BASE = '/api';

export const ROLES = {
  CUSTOMER: 'Customer',
  EXECUTIVE: 'Support Executive',
  QA: 'QA Team',
  MANAGER: 'Operations Manager'
};

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('resolvo_role') || ROLES.CUSTOMER;
  });
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync role to localStorage
  useEffect(() => {
    localStorage.setItem('resolvo_role', userRole);
  }, [userRole]);

  // Fetch complaints on load
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);

      // Try Appwrite first if configured
      if (APPWRITE_CONFIG.databaseId && APPWRITE_CONFIG.collectionId) {
        try {
          const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collectionId,
            [Query.orderDesc('$createdAt'), Query.limit(100)]
          );
          
          // Map Appwrite document structure to our app structure
          const mappedData = response.documents.map(doc => {
            const createdAt = doc.$createdAt || new Date().toISOString();
            const slaHours = doc.resolution_time || 24;
            const slaDeadline = new Date(new Date(createdAt).getTime() + slaHours * 60 * 60 * 1000).toISOString();
            
            return {
              id: doc.complaint_id || doc.$id,
              title: doc.text ? (doc.text.length > 50 ? doc.text.substring(0, 50) + '...' : doc.text) : 'No Title',
              description: doc.text || '',
              category: doc.category || 'Product Issue',
              priority: doc.priority || 'Medium',
              status: doc.status || 'Open',
              assignedTo: doc.assignedTo || 'Auto Assigned',
              sentiment: { 
                label: doc.sentiment > 0.7 ? 'Happy' : doc.sentiment < 0.4 ? 'Angry' : 'Neutral', 
                icon: doc.sentiment > 0.7 ? '😊' : doc.sentiment < 0.4 ? '😠' : '😐',
                score: (doc.sentiment || 0.5) * 100 
              },
              createdAt,
              slaDeadline,
              confidence: doc.confidence || '90%',
              resolution: doc.resolution || 'Pending Analysis',
              resolutionExplanation: doc.resolutionExplanation || 'Awaiting further data.',
              attempts: doc.attempts || 1,
              escalated: doc.escalated || false,
              ...doc
            };
          });
          
          setComplaints(mappedData);
          return;
        } catch (appwriteError) {
          console.warn('Appwrite fetch failed, falling back to local API:', appwriteError);
        }
      }

      // Fallback to local API
      const response = await fetch(`${API_BASE}/complaints`);
      const data = await response.json();
      setComplaints(data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addComplaint = async (data) => {
    try {
      // Try Appwrite if configured
      if (APPWRITE_CONFIG.databaseId && APPWRITE_CONFIG.collectionId) {
        try {
          const response = await databases.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collectionId,
            'unique()',
            {
              complaint_id: `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
              text: data.description || '',
              category: data.category || 'General',
              priority: data.priority || 'Medium',
              sentiment: data.sentiment?.score / 100 || 0,
              status: 'Open',
              // Add other fields as per Appwrite schema
            }
          );
          const newComplaint = {
            id: response.$id,
            ...data,
            createdAt: response.$createdAt
          };
          setComplaints(prev => [newComplaint, ...prev]);
          return newComplaint;
        } catch (appwriteError) {
          console.warn('Appwrite create failed, falling back to local API:', appwriteError);
        }
      }

      // Fallback to local API
      const response = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const newComplaint = await response.json();
      setComplaints(prev => [newComplaint, ...prev]);
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
    } catch (error) {
      console.error('Error escalating:', error);
    }
  };

  const generateAIResponse = async (data) => {
    // Artificial delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    const keywords = ["talk to human", "connect to agent", "human support"];
    const needsHuman = keywords.some(k => data.description?.toLowerCase().includes(k) || data.emailBody?.toLowerCase().includes(k));

    if (needsHuman) {
      return {
        isEscalated: true,
        response: "Wait for a few minutes... connecting to human support."
      };
    }

    return {
      isEscalated: false,
      response: `Recipients: ${data.recipient || 'Customer'}\nSubject: ${data.emailSubject || 'Re: Your Complaint'}\n\nBody:\nDear ${data.recipient || 'User'},\n\nWe have received your concerns regarding "${data.emailSubject || 'the issue'}" and we sincerely apologize for the inconvenience. Our team has summarized the issue and we are prioritizing its resolution within the next 24-48 hours. Stay assured that we are on it.\n\nFooter:\nThis email reply is generated by human.`
    };
  };

  return (
    <AppContext.Provider value={{
      userRole,
      setUserRole,
      complaints,
      addComplaint,
      updateComplaintStatus,
      escalateComplaint,
      isLoading,
      fetchComplaints,
      generateAIResponse
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
