/**
 * Resolvo Processing Engine Logic
 * Simulates automated classification, sentiment analysis, and priority assessment.
 */

const KEYWORDS = {
  PRODUCT: ['broken', 'quality', 'taste', 'effect', 'product', 'item', 'defective', 'expired', 'smell'],
  PACKAGING: ['leak', 'bottle', 'cap', 'seal', 'package', 'box', 'damaged box', 'wrapper', 'label'],
  TRADE: ['distributor', 'retail', 'bulk', 'price', 'sale', 'partnership', 'wholesale', 'invoice', 'margin'],
  URGENT: ['urgent', 'immediately', 'hospital', 'lawsuit', 'refund now', 'emergency', 'asap', 'safety'],
  NEGATIVE: ['angry', 'frustrated', 'terrible', 'worst', 'bad', 'disappointed', 'unacceptable', 'poor'],
  POSITIVE: ['thanks', 'happy', 'good', 'satisfied', 'great', 'awesome']
};

export const classifyComplaint = (text) => {
  const content = text.toLowerCase();
  
  if (KEYWORDS.PACKAGING.some(k => content.includes(k))) return 'Packaging Issue';
  if (KEYWORDS.TRADE.some(k => content.includes(k))) return 'Trade Inquiry';
  
  // Default to Product Issue if it contains product keywords or is unknown
  return 'Product Issue';
};

export const analyzeSentiment = (text) => {
  const content = text.toLowerCase();
  let score = 50; // Neutral

  KEYWORDS.NEGATIVE.forEach(k => { if (content.includes(k)) score -= 15; });
  KEYWORDS.URGENT.forEach(k => { if (content.includes(k)) score -= 20; });
  KEYWORDS.POSITIVE.forEach(k => { if (content.includes(k)) score += 15; });

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  if (score < 40) return { label: 'Angry', score, icon: '😠' };
  if (score > 70) return { label: 'Happy', score, icon: '😊' };
  return { label: 'Neutral', score, icon: '😐' };
};

export const determinePriority = (text, sentiment) => {
  const content = text.toLowerCase();
  const isUrgent = KEYWORDS.URGENT.some(k => content.includes(k));
  
  if (isUrgent || sentiment.score < 30) return 'High';
  if (sentiment.score < 50) return 'Medium';
  return 'Low';
};

export const generateResolution = (category) => {
  switch (category) {
    case 'Product Issue':
      return {
        action: 'Replacement / Refund',
        explanation: 'Based on the reported quality issue, we recommend initiating a full replacement or refund. Our quality team will also investigate the batch number provided.'
      };
    case 'Packaging Issue':
      return {
        action: 'Apology + Replacement',
        explanation: 'We regret the packaging failure. A replacement with reinforced packaging has been scheduled. Logistics has been notified to inspect current stock.'
      };
    case 'Trade Inquiry':
      return {
        action: 'Forward to Sales Team',
        explanation: 'This inquiry regarding bulk or retail trade has been routed to our regional sales manager for a specialized response within 12 hours.'
      };
    default:
      return {
        action: 'Manual Review',
        explanation: 'The complaint requires further review by a human agent to determine the best course of action.'
      };
  }
};

export const getConfidenceAssessment = () => {
  // Simulate a high confidence score for production feel
  return Math.floor(85 + Math.random() * 10) + '%';
};

export const getSLAHours = (priority) => {
  if (priority === 'High') return 24;
  if (priority === 'Medium') return 48;
  return 72;
};
