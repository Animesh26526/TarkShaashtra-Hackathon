import React from 'react';
import { motion } from 'framer-motion';

const ComplaintTypeCard = ({ title, icon: Icon, description, onClick, active }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`card type-card ${active ? 'active' : ''}`}
    >
      <div className="icon-wrapper">
        <Icon size={32} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      
      <style>{`
        .type-card {
          cursor: pointer;
          text-align: center;
          padding: 2.5rem 1.5rem;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .type-card:hover {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }

        .type-card.active {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
        }

        p {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </motion.div>
  );
};

export default ComplaintTypeCard;
