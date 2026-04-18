import { useEffect, useState } from 'react';
import { Query } from 'appwrite';
import { databases, DB_ID, COL_ID } from './appwrite';
import { ChevronRight, ChevronDown, Database, LayoutList, Loader2 } from 'lucide-react';
import './index.css';

// Types
interface Complaint {
  $id: string;
  complaint_id: string;
  text: string;
  category: string;
  priority: string;
  sentiment: number;
  resolution_time: number;
}

const TreeNode = ({ label, children, isLeaf = false, data = null }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isLeaf && data) {
    return (
      <div className="leaf-node">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>ID: {data.complaint_id}</strong>
          <span style={{ color: data.priority === 'High' ? '#ef4444' : data.priority === 'Medium' ? '#eab308' : '#22c55e' }}>
            {data.priority}
          </span>
        </div>
        <p style={{ margin: '8px 0', color: '#f8fafc' }}>{data.text}</p>
        <div style={{ display: 'flex', gap: '15px', fontSize: '0.85em', color: '#94a3b8' }}>
          <span>Sentiment: {data.sentiment.toFixed(2)}</span>
          <span>Resolution Time: {data.resolution_time} hrs</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tree-node">
      <div className="tree-header" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <ChevronDown size={18} style={{ marginRight: 8, color: '#a78bfa' }} /> : <ChevronRight size={18} style={{ marginRight: 8, color: '#a78bfa' }} />}
        <span style={{ fontSize: '1.1em' }}>{label}</span>
      </div>
      {isOpen && (
        <div className="tree-content tree-item">
          {children}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [data, setData] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const fetchData = async () => {
    if (!DB_ID || !COL_ID) {
      setLoading(false);
      return; // Error or credentials missing
    }

    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DB_ID,
        COL_ID,
        [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc('$createdAt')
        ]
      );
      setData(response.documents as unknown as Complaint[]);
      setTotal(response.total);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [offset]);

  // Group data by Category -> Priority
  const groupedData: Record<string, Record<string, Complaint[]>> = {};
  
  data.forEach((item) => {
    if (!groupedData[item.category]) groupedData[item.category] = {};
    if (!groupedData[item.category][item.priority]) groupedData[item.category][item.priority] = [];
    groupedData[item.category][item.priority].push(item);
  });

  const handleNext = () => setOffset(prev => prev + limit);
  const handlePrev = () => setOffset(prev => Math.max(0, prev - limit));

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', color: '#f8fafc', fontSize: '2.5rem', marginBottom: '10px' }}>
          <Database size={40} color="#8b5cf6" />
          Appwrite Complaints
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
          Interactive Data Explorer showing 100 entries per page.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '20px', minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutList size={20} color="#34d399" />
            <span style={{ fontWeight: 600 }}>Viewing {offset + 1} - {Math.min(offset + limit, total)} out of {total} entries</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handlePrev} disabled={offset === 0 || loading}>
              Previous
            </button>
            <button onClick={handleNext} disabled={(offset + limit) >= total || loading}>
              Next Hub
            </button>
          </div>
        </div>

        {/* Missing Credentials Alert */}
        {(!DB_ID || !COL_ID) && !loading && (
          <div style={{ padding: '20px', background: 'rgba(239,68,68,0.2)', borderRadius: '8px', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center' }}>
            <h3>Database Configuration Missing</h3>
            <p>Please run the Node.js <code>upload.js</code> script first and ensure your <code>.env</code> file is configured correctly.</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (DB_ID && COL_ID) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '15px' }}>
            <Loader2 size={48} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#c4b5fd' }}>Loading Data...</span>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Render Tree */}
            {Object.entries(groupedData).map(([category, priorities]) => (
              <TreeNode key={category} label={`${category} (${Object.values(priorities).flat().length})`}>
                {Object.entries(priorities).map(([priority, items]) => (
                  <TreeNode key={priority} label={`${priority} Priority (${items.length})`}>
                    {items.map(item => (
                      <TreeNode key={item.$id} isLeaf data={item} />
                    ))}
                  </TreeNode>
                ))}
              </TreeNode>
            ))}
            
            {data.length === 0 && (DB_ID && COL_ID) && !loading && (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                No records found. The database might be empty.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
