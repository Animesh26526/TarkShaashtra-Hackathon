import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const API_BASE = '/api';

export const ROLES = {
  CUSTOMER: 'Customer',
  EXECUTIVE: 'Support Executive',
  QA: 'QA Team',
  MANAGER: 'Operations Manager'
};

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(ROLES.MANAGER); // Default for demo
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch complaints on load
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
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

  return (
    <AppContext.Provider value={{
      userRole,
      setUserRole,
      complaints,
      addComplaint,
      updateComplaintStatus,
      escalateComplaint,
      isLoading,
      fetchComplaints
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
