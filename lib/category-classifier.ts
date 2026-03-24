export type EmailCategory = 
  | 'social'           // Social networks, forums, messaging
  | 'transactional'    // Receipts, confirmations, shipping
  | 'jobs'             // Job offers, career opportunities
  | 'events'           // Event invitations, calendar
  | 'personal'         // Personal emails from individuals
  | 'updates'          // Updates, notifications, alerts
  | 'promotional'      // Marketing, newsletters, deals
  | 'inbox';           // Default/uncategorized

interface CategoryKeywords {
  social: string[];
  transactional: string[];
  jobs: string[];
  events: string[];
  personal: string[];
  updates: string[];
  promotional: string[];
}

const CATEGORY_KEYWORDS: CategoryKeywords = {
  social: [
    'facebook', 'twitter', 'linkedin', 'instagram', 'snapchat', 'tiktok',
    'social network', 'friend request', 'follower', 'commented', 'liked',
    'mentioned you', 'tagged you', 'connection request', 'message you'
  ],
  transactional: [
    'receipt', 'invoice', 'payment', 'order confirmation', 'shipping',
    'delivered', 'tracking', 'transaction', 'purchase', 'order #',
    'card ending', 'payment received', 'refund', 'subscription',
    'billing', 'statement', 'checkout', 'your order'
  ],
  jobs: [
    'job', 'career', 'hiring', 'opportunity', 'position', 'apply',
    'interview', 'resume', 'cv', 'recruiter', 'employment',
    'job alert', 'candidate', 'application', 'workplace', 'offer letter',
    'software engineer', 'developer', 'full stack', 'vacancy'
  ],
  events: [
    'event', 'invitation', 'invite', 'calendar', 'meeting', 'rsvp',
    'schedule', 'webinar', 'conference', 'seminar', 'workshop',
    'join us', 'save the date', 'upcoming', 'register now', 'attendance'
  ],
  personal: [
    'from:', 'dear', 'hi', 'hello', 'regards', 'best wishes',
    'yours', 'sincerely', 'hope you', 'how are you', 'wanted to reach out'
  ],
  updates: [
    'update', 'notification', 'alert', 'reminder', 'news',
    'announcement', 'release', 'version', 'security alert',
    'password reset', 'verify', 'confirm your', 'action required',
    'account activity', 'new feature', 'changelog'
  ],
  promotional: [
    'sale', 'discount', 'offer', 'deal', 'coupon', 'promo',
    'limited time', 'exclusive', 'save', 'free shipping',
    'unsubscribe', 'newsletter', 'weekly', 'special offer',
    '% off', 'buy now', 'shop now', 'marketing', 'advertisement'
  ]
};

const SENDER_PATTERNS: Record<string, EmailCategory> = {
  // Social
  'facebook.com': 'social',
  'facebookmail.com': 'social',
  'twitter.com': 'social',
  'linkedin.com': 'social',
  'instagram.com': 'social',
  
  // Transactional
  'amazon.com': 'transactional',
  'paypal.com': 'transactional',
  'stripe.com': 'transactional',
  'uber.com': 'transactional',
  'swiggy.in': 'transactional',
  'zomato.com': 'transactional',
  
  // Jobs
  'indeed.com': 'jobs',
  'naukri.com': 'jobs',
  'linkedin.com/jobs': 'jobs',
  'glassdoor.com': 'jobs',
  
  // Updates
  'github.com': 'updates',
  'gitlab.com': 'updates',
  'notifications@': 'updates',
  'noreply@': 'updates',
};

export function classifyEmailCategory(
  from: string,
  subject: string,
  body: string
): EmailCategory {
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase().substring(0, 500); // First 500 chars
  const combinedText = `${lowerSubject} ${lowerBody}`;

  // Check sender patterns first
  for (const [pattern, category] of Object.entries(SENDER_PATTERNS)) {
    if (lowerFrom.includes(pattern)) {
      return category;
    }
  }

  // Score each category based on keyword matches
  const scores: Record<EmailCategory, number> = {
    social: 0,
    transactional: 0,
    jobs: 0,
    events: 0,
    personal: 0,
    updates: 0,
    promotional: 0,
    inbox: 0
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const cat = category as keyof CategoryKeywords;
    let score = 0;
    
    for (const keyword of keywords) {
      // Subject matches are worth more
      if (lowerSubject.includes(keyword)) {
        score += 3;
      }
      // Body matches
      if (lowerBody.includes(keyword)) {
        score += 1;
      }
    }
    
    scores[cat] = score;
  }

  // Special rules
  
  // If no keywords matched but looks personal (short, personal sender)
  if (Object.values(scores).every(s => s === 0)) {
    // Check if from looks like a person (not automated)
    if (!lowerFrom.includes('noreply') && 
        !lowerFrom.includes('no-reply') &&
        !lowerFrom.includes('automated') &&
        !lowerFrom.includes('notifications')) {
      return 'personal';
    }
    return 'inbox'; // Default
  }

  // If promotional keywords are dominant, classify as promotional
  if (scores.promotional > 5) {
    return 'promotional';
  }

  // Find category with highest score
  let maxScore = 0;
  let bestCategory: EmailCategory = 'inbox';
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as EmailCategory;
    }
  }

  // Require minimum score threshold
  if (maxScore < 2) {
    return 'inbox';
  }

  return bestCategory;
}

// Helper to get category display name
export function getCategoryDisplayName(category: EmailCategory): string {
  const names: Record<EmailCategory, string> = {
    social: 'Social',
    transactional: 'Transactional',
    jobs: 'Jobs',
    events: 'Events',
    personal: 'Personal',
    updates: 'Updates & Notifications',
    promotional: 'Promotional',
    inbox: 'Inbox'
  };
  return names[category];
}
