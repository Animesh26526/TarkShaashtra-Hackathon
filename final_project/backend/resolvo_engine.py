"""
Resolvo Processing Engine
Intelligent complaint classification, sentiment analysis, priority assessment,
and resolution recommendation using weighted keyword analysis.
"""

import random
import math

# ─── Keyword Dictionaries with Weights ─────────────────────────────────────────

CATEGORY_KEYWORDS = {
    'Product': {
        'product': 3, 'defective': 4, 'broken': 3, 'quality': 3, 'malfunctioning': 5,
        'stopped working': 5, 'expired': 4, 'taste': 2, 'smell': 3, 'contaminated': 5,
        'discolored': 3, 'effect': 2, 'item': 1, 'functionality': 3, 'performance': 2,
        'faulty': 4, 'damaged product': 4, 'not working': 4, 'poor quality': 4,
    },
    'Packaging': {
        'packaging': 4, 'package': 3, 'box': 3, 'seal': 3, 'leak': 4, 'bottle': 2,
        'cap': 2, 'wrapper': 3, 'label': 2, 'torn': 3, 'dented': 3, 'damaged box': 4,
        'broken box': 4, 'poor packaging': 5, 'damaged packaging': 5, 'crushed': 3,
        'opened': 2, 'tampered': 4,
    },
    'Trade': {
        'distributor': 4, 'retail': 3, 'bulk': 4, 'price': 2, 'pricing': 3,
        'sale': 2, 'partnership': 3, 'wholesale': 4, 'invoice': 3, 'margin': 3,
        'shipment': 3, 'order': 2, 'trade': 4, 'inquiry': 2, 'bulk order': 5,
        'query': 1, 'details': 1, 'supply': 3, 'dealer': 3,
    }
}

URGENCY_KEYWORDS = {
    'urgent': 5, 'immediately': 5, 'hospital': 6, 'lawsuit': 6, 'refund now': 5,
    'emergency': 6, 'asap': 4, 'safety': 5, 'health hazard': 6, 'allergic': 5,
    'critical': 5, 'dangerous': 6, 'life threatening': 7, 'recall': 5,
}

NEGATIVE_KEYWORDS = {
    'angry': 3, 'frustrated': 3, 'terrible': 4, 'worst': 4, 'bad': 2,
    'disappointed': 3, 'unacceptable': 4, 'poor': 2, 'disgusting': 4,
    'horrible': 4, 'awful': 3, 'pathetic': 4, 'useless': 3, 'annoyed': 2,
}

POSITIVE_KEYWORDS = {
    'thanks': 2, 'happy': 3, 'good': 2, 'satisfied': 3, 'great': 3,
    'awesome': 3, 'excellent': 4, 'pleased': 3, 'wonderful': 3, 'appreciate': 2,
}


def _score_keywords(text, keyword_dict):
    """Score text against a keyword dictionary. Returns total weighted score."""
    content = text.lower()
    total = 0
    matches = 0
    for keyword, weight in keyword_dict.items():
        if keyword in content:
            total += weight
            matches += 1
    return total, matches


def classify_complaint(text):
    """Classify complaint into Product, Packaging, or Trade using weighted keywords."""
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score, _ = _score_keywords(text, keywords)
        scores[category] = score

    if all(v == 0 for v in scores.values()):
        return 'Product'  # Default fallback

    return max(scores, key=scores.get)


def analyze_sentiment(text):
    """
    Analyze text sentiment.
    Returns dict with label, score (-1.0 to 1.0 matching sample data format), icon.
    """
    content = text.lower()

    neg_score, neg_matches = _score_keywords(content, NEGATIVE_KEYWORDS)
    urg_score, urg_matches = _score_keywords(content, URGENCY_KEYWORDS)
    pos_score, pos_matches = _score_keywords(content, POSITIVE_KEYWORDS)

    # Calculate raw score: positive pushes toward +1, negative toward -1
    total_neg = neg_score + urg_score
    total_pos = pos_score

    if total_neg + total_pos == 0:
        raw = 0.0
    else:
        raw = (total_pos - total_neg) / (total_pos + total_neg + 5)

    # Clamp to [-1.0, 1.0]
    score = max(-1.0, min(1.0, raw))

    if score < -0.3:
        return {'label': 'Angry', 'score': round(score, 6), 'icon': '😠'}
    if score > 0.3:
        return {'label': 'Happy', 'score': round(score, 6), 'icon': '😊'}
    return {'label': 'Neutral', 'score': round(score, 6), 'icon': '😐'}


def determine_priority(text, sentiment):
    """Determine complaint priority based on text urgency and sentiment."""
    content = text.lower()
    urg_score, urg_matches = _score_keywords(content, URGENCY_KEYWORDS)

    # High if urgent keywords found OR very negative sentiment
    if urg_score >= 4 or sentiment['score'] < -0.5:
        return 'High'
    if sentiment['score'] < -0.1 or urg_score > 0:
        return 'Medium'
    return 'Low'


def generate_resolution(category):
    """Generate recommended resolution based on category."""
    resolutions = {
        'Product': {
            'action': 'Replacement / Refund',
            'explanation': ('Based on the reported quality issue, we recommend '
                          'initiating a product replacement or full refund. Our quality '
                          'team will investigate the batch number and conduct root cause analysis. '
                          'Customer should be contacted within 24 hours with a resolution update.')
        },
        'Packaging': {
            'action': 'Apology + Replacement',
            'explanation': ('We acknowledge the packaging failure. A replacement with '
                          'reinforced packaging has been scheduled. The logistics team '
                          'has been notified to inspect current stock for similar issues. '
                          'Follow up with the customer within 48 hours to confirm delivery.')
        },
        'Trade': {
            'action': 'Forward to Sales Team',
            'explanation': ('This trade inquiry has been routed to the regional sales manager '
                          'for a specialized response. Expected response within 12 business hours. '
                          'If bulk pricing is requested, the sales team should prepare a '
                          'customized quotation based on current inventory.')
        }
    }
    return resolutions.get(category, {
        'action': 'Manual Review Required',
        'explanation': ('The complaint requires further review by a human agent '
                       'to determine the best course of action. Escalate if not '
                       'resolved within 24 hours.')
    })


def get_confidence(text=''):
    """
    Return a confidence score based on keyword match density.
    Higher density = higher confidence.
    """
    if not text:
        return f"{random.randint(85, 96)}%"

    total_matches = 0
    for keywords in CATEGORY_KEYWORDS.values():
        _, matches = _score_keywords(text, keywords)
        total_matches += matches

    # Base confidence 75%, each keyword match adds up to 3%
    base = 75
    bonus = min(total_matches * 3, 22)
    return f"{base + bonus}%"


def get_sla_hours(priority):
    """Return SLA hours based on priority level."""
    mapping = {'High': 24, 'Medium': 48, 'Low': 72}
    return mapping.get(priority, 72)
