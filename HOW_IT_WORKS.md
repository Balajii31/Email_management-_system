# 📧 How Email Fetching, Detection & Prioritization Works

## 🔄 Complete Workflow

### Step 1: User Logs In with Google
1. User clicks "Sign in with Google" on login page
2. Google OAuth flow completes
3. User is redirected to `/inbox`

### Step 2: Connect Gmail (One-time Setup)
1. Click the **profile icon** (top right)
2. Select **"Connect Gmail"** from dropdown
3. Authorize Gmail access (read & modify permissions)
4. System saves encrypted OAuth tokens to database

### Step 3: Sync Emails (Fetch & Process)

**Manual Trigger:**
- Click the **🔄 Sync button** in top navigation bar
- OR go to: http://localhost:3000/api/emails/sync (manual API call)

**What Happens:**

```
User clicks Sync Button
        ↓
API: POST /api/emails/sync
        ↓
1. Check user authentication
2. Create SyncJob in database
3. Fetch emails from Gmail API
        ↓
FOR EACH EMAIL:
        ↓
┌───────────────────────────────────────────┐
│ 4. Extract email data:                   │
│    • From, To, Subject, Body             │
│    • Timestamp, Labels, Thread ID        │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 5. BERT AI Classification:               │
│                                           │
│    Send to: http://localhost:8000/predict│
│                                           │
│    ✅ Is Spam? (Yes/No + confidence)     │
│    ✅ Priority? (High/Medium/Low)        │
│    ✅ Category? (work/personal/social)   │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 6. Take Actions in Gmail:                │
│                                           │
│    IF SPAM:                              │
│    → Move to Gmail Spam folder           │
│    → Mark as spam in database            │
│                                           │
│    IF HIGH PRIORITY (non-spam):          │
│    → Add "Priority/High" label in Gmail  │
│    → Mark as high priority in database   │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 7. Save to Database:                     │
│    • Email content & metadata            │
│    • Spam status (true/false)            │
│    • Priority (high/medium/low)          │
│    • Category classification             │
│    • Folder (inbox/spam/sent/drafts)     │
└───────────────────────────────────────────┘
        ↓
Update UI - Emails appear in inbox
```

### Step 4: View Classified Emails

**In the UI:**
- Emails are grouped by priority: High → Medium → Low
- Spam emails are in separate folder (accessible via sidebar)
- Each email shows:
  - Priority badge (🔴 High, 🟡 Medium, 🟢 Low)
  - Category tag
  - AI summary (if available)

## 📁 Key Files & Their Roles

### 1. **Email Sync API** (`app/api/emails/sync/route.ts`)
**Purpose:** Main endpoint to fetch and process emails

**Key Functions:**
```typescript
POST /api/emails/sync
- Authenticates user
- Creates sync job
- Calls runSync() function

runSync(userId, jobId):
- Fetches emails from Gmail
- Classifies each with BERT
- Moves spam to spam folder
- Labels high priority emails
- Saves to database
```

### 2. **Gmail Client** (`lib/gmail-client.ts`)
**Purpose:** Interact with Gmail API

**Key Functions:**
```typescript
fetchEmails(userId)          // Get emails from Gmail
getEmailContent(userId, id)  // Get full email details
moveToSpam(userId, id)       // Move spam to Gmail spam folder
addLabel(userId, id, label)  // Add priority labels
```

### 3. **BERT Classifier** (`lib/bert-classifier.ts`)
**Purpose:** Communicate with Python ML server

**Key Functions:**
```typescript
classify(subject, body)      // Classify single email
classifyBatch(emails)        // Classify multiple emails
isSpam(subject, body)        // Quick spam check
```

### 4. **UI Components**
- **Top Nav** (`components/email/top-nav.tsx`) - Has the Sync button
- **Email List** (`components/email/email-list.tsx`) - Shows emails grouped by priority
- **Email Detail** (`components/email/email-detail.tsx`) - Shows full email content

## 🎯 Classification Results

### What BERT Detects:

**1. Spam Detection:**
```json
{
  "is_spam": true,
  "spam_confidence": 0.98,
  "spam": "spam"
}
```

**Actions:**
- ✅ Move to Gmail spam folder
- ✅ Mark as spam in database
- ✅ Remove from inbox view

**2. Priority Classification:**
```json
{
  "priority": "High",
  "priority_score": 3,
  "priority_scores": {
    "Low": 0.05,
    "Medium": 0.15,
    "High": 0.80
  }
}
```

**Actions:**
- ✅ Add "Priority/High" label in Gmail
- ✅ Save priority to database
- ✅ Show in High Priority section

**3. Category Classification:**
```json
{
  "category": "work",
  "category_scores": {
    "work": 0.85,
    "personal": 0.10,
    "social": 0.03,
    "spam": 0.02
  }
}
```

**Actions:**
- ✅ Save category to database
- ✅ Can filter by category in UI

## 🚀 How to Use (Step by Step)

### First Time Setup:

1. **Start Services:**
   ```bash
   # Terminal 1: BERT ML Server
   npm run ml:serve
   
   # Terminal 2: Next.js App
   npm run dev
   ```

2. **Login & Connect:**
   - Go to http://localhost:3000
   - Sign in with Google
   - Click profile → "Connect Gmail"
   - Authorize permissions

3. **Sync Emails:**
   - Click 🔄 Sync button in top bar
   - Wait for sync to complete (you'll see a success toast)

4. **View Results:**
   - Emails appear grouped by priority
   - Spam emails moved to spam folder
   - High priority emails labeled

### Daily Usage:

**Option A: Manual Sync**
- Click 🔄 button whenever you want to fetch new emails
- Takes ~2-5 seconds per email

**Option B: Background Processor (Automatic)**
```bash
npm run email:processor
```
- Runs every 5 minutes automatically
- Processes new emails in background
- No manual action needed

## 🔍 Example: What Happens with a Spam Email

**Email Received:**
```
From: scammer@fake-bank.com
Subject: URGENT: Your account will be locked!
Body: Click here immediately to verify your account...
```

**Processing Flow:**
1. **Fetch:** Email retrieved from Gmail API
2. **Classify:** BERT analyzes → 99% spam confidence
3. **Action:** 
   - Moved to Gmail spam folder ✅
   - Saved to DB as spam ✅
   - Removed from inbox ✅
4. **Result:** User never sees it in inbox

## 🔍 Example: What Happens with High Priority Email

**Email Received:**
```
From: boss@company.com
Subject: URGENT: Project deadline tomorrow
Body: Please review the attached document ASAP...
```

**Processing Flow:**
1. **Fetch:** Email retrieved from Gmail API
2. **Classify:** 
   - BERT → Not spam (2% spam confidence)
   - BERT → High priority (85% confidence)
   - BERT → Category: "work"
3. **Action:**
   - Added "Priority/High" label in Gmail ✅
   - Saved to DB with priority="high" ✅
   - Kept in inbox ✅
4. **Result:** 
   - Appears at top of inbox (High Priority section)
   - Has 🔴 high priority badge
   - Gmail also shows the label

## 📊 Monitoring & Logs

**In Terminal (where Next.js is running):**
```
🤖 BERT ML Server: ✅ Available
📧 Email "Meeting tomorrow..." classified by BERT: {
  spam: false,
  priority: 'medium',
  category: 'work',
  confidence: 0.95
}
🗑️ Moved email to spam: "WIN FREE PRIZES NOW..."
✅ Sync completed: 23 new emails, 3 moved to spam
```

**In Browser Console (F12):**
- API calls to /api/emails/sync
- Sync progress updates
- Any errors or warnings

## 🎛️ Customization

### Change Spam Threshold:
Edit `lib/bert-classifier.ts` to adjust confidence threshold for spam detection.

### Change Sync Frequency:
Edit `scripts/email-processor.ts`:
```typescript
const POLL_INTERVAL_MS = 5 * 60 * 1000; // Change 5 to any number of minutes
```

### Add Custom Priority Rules:
Edit `app/api/emails/sync/route.ts` to add custom logic:
```typescript
// Example: Always mark emails from boss as high priority
if (from.includes('boss@company.com')) {
  priority = 'high';
}
```

## 🧪 Test the Classification

**Test Single Email:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Your email content here", "subject": "Test Subject"}'
```

**Test via Next.js API:**
```bash
curl -X POST http://localhost:3000/api/classify/spam \
  -H "Content-Type: application/json" \
  -d '{"from": "test@example.com", "subject": "Test", "body": "Test email"}'
```

## ⚡ Performance

**Current System:**
- Classifies ~5-10 emails per second
- Uses BERT (DistilBERT) on CPU
- Average classification: 83-189ms per email

**For Large Volumes:**
- Use batch processing: `classifyBatch()`
- Enable GPU on ML server for 10x speed
- Run background processor for continuous processing

## 🎯 Summary

**How it works in practice:**

1. **You click Sync** → System fetches emails from Gmail
2. **BERT analyzes each** → Spam? Priority? Category?
3. **Actions taken automatically:**
   - Spam → Gmail spam folder
   - High priority → Gmail label
4. **You see clean inbox** → Organized by priority, spam filtered

**No manual work needed** - AI does it all! 🤖✨
