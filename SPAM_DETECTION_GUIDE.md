# Email Spam Detection & Priority Classification System

## 🎯 Overview

This system automatically detects spam emails and classifies email priority using a BERT-based AI model. When a user is logged in, the system:

1. ✅ **Detects Spam** - Uses BERT AI model to identify spam emails
2. 🗑️ **Moves to Spam Folder** - Automatically moves spam emails to Gmail spam folder
3. 🎯 **Classifies Priority** - Categorizes non-spam emails as High, Medium, or Low priority
4. 🏷️ **Labels High Priority** - Automatically labels high-priority emails in Gmail

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Email Flow                                │
└──────────────────────────────────────────────────────────────┘

1. Gmail Account → Fetch Emails
           ↓
2. BERT ML Server (Python FastAPI) → Classify
           ↓
3. Decision Engine
           ├─→ [SPAM] → Move to Gmail Spam Folder → Save to DB
           └─→ [NOT SPAM] → Classify Priority → Label & Save to DB
```

## 📁 Key Components

### 1. **BERT ML Server** (`ml_pipeline/serve.py`)
Python FastAPI server that serves the BERT model for classification.

**Endpoints:**
- `POST /predict` - Classify single email
- `POST /predict/batch` - Classify multiple emails
- `GET /health` - Check server status

### 2. **BERT Client** (`lib/bert-classifier.ts`)
TypeScript client to communicate with the Python ML server.

### 3. **Gmail Client** (`lib/gmail-client.ts`)
Handles Gmail API operations:
- Fetch emails
- Move to spam folder
- Add labels
- Mark as read/unread

### 4. **Email Sync** (`app/api/emails/sync/route.ts`)
Manual sync triggered by user - processes all emails.

### 5. **Background Processor** (`scripts/email-processor.ts`)
Continuous monitoring for new emails (runs every 5 minutes).

## 🚀 Setup Instructions

### Step 1: Database Migration

Update your database schema with the new fields:

```bash
npx prisma generate
npx prisma db push
```

### Step 2: Start the BERT ML Server

```bash
cd ml_pipeline
python serve.py
```

The server will start at `http://localhost:8000`

**Note:** Make sure you have the trained model at:
- `ml_pipeline/saved_models/best_model.pt`
- `ml_pipeline/saved_models/tokenizer/`

### Step 3: Start the Next.js Application

```bash
npm run dev
```

The app will start at `http://localhost:3000`

### Step 4: (Optional) Start Background Email Processor

For continuous email monitoring:

```bash
npx tsx scripts/email-processor.ts
```

This will:
- Check for new emails every 5 minutes
- Automatically classify and move spam emails
- Label high-priority emails

## 🔧 Configuration

### Environment Variables (`.env`)

```env
# BERT ML Server
ML_SERVER_URL="http://localhost:8000"

# Google OAuth (already configured)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Database (already configured)
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."
```

### Email Processor Settings

Edit `scripts/email-processor.ts`:

```typescript
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 20; // Emails per check
```

## 📊 How It Works

### Manual Sync (User-Initiated)

1. User logs in with Google account
2. User clicks "Sync Emails" button in UI
3. System calls `/api/emails/sync`
4. Process:
   - Fetches recent emails from Gmail
   - Sends each email to BERT for classification
   - If spam: Moves to Gmail spam folder + marks in DB
   - If not spam: Classifies priority + adds label if high priority
   - Saves all emails to database

### Background Processing (Automatic)

1. Background script runs every 5 minutes
2. For each user with Gmail connected:
   - Fetches latest emails
   - Classifies with BERT
   - Takes action (move spam, label priority)
   - Saves to database

### Fallback Strategy

If BERT server is unavailable:
- ✅ System falls back to simple Bayes classifier
- ✅ Processing continues without interruption
- ⚠️ Lower accuracy than BERT

## 🧪 Testing

### Test 1: Check BERT Server

```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu"
}
```

### Test 2: Test Classification API

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Congratulations! You have won $1,000,000! Click here now!",
    "subject": "You Won!"
  }'
```

Should return spam classification.

### Test 3: Test Next.js API

```bash
curl -X POST http://localhost:3000/api/classify/spam \
  -H "Content-Type: application/json" \
  -d '{
    "from": "scammer@example.com",
    "subject": "You Won!",
    "body": "Click here to claim your prize!"
  }'
```

### Test 4: Run Manual Sync

1. Log in to the application
2. Navigate to inbox
3. Click "Sync Emails" button
4. Check console logs to see classification results

## 📈 Monitoring

### Server Logs

**BERT Server:**
```
✅ EmailClassifier loaded successfully
📧 Email "Re: Meeting tomorrow..." classified by BERT: {...}
```

**Background Processor:**
```
📬 Email Processor Cycle #1
👥 Found 1 user(s) to process
✅ Processed: 5, Spam: 2, Errors: 0
```

### Database Checks

Check spam emails:
```sql
SELECT subject, from, priority FROM "Email" WHERE "isSpam" = true;
```

Check high priority:
```sql
SELECT subject, from, priority FROM "Email" WHERE priority = 'high';
```

## 🎯 Classification Results

### Spam Detection
- **Input:** Email subject + body
- **Output:** 
  - `is_spam`: true/false
  - `spam_confidence`: 0.0 - 1.0
  - **Action:** If spam, move to Gmail spam folder

### Priority Classification
- **Levels:** Low (1), Medium (2), High (3)
- **Based on:** Content urgency, sender importance, keywords
- **Action:** If high priority, add Gmail label "Priority/High"

### Category Classification
- **Categories:** work, personal, social, promotions, finance, spam
- **Use:** Helps organize emails in the UI

## 🔍 Troubleshooting

### BERT Server Not Starting

**Error:** "No trained model found"

**Solution:** 
1. Train the model using `ml_pipeline/Email_BERT_Training.ipynb`
2. Copy `best_model.pt` to `ml_pipeline/saved_models/`
3. Copy tokenizer folder to `ml_pipeline/saved_models/tokenizer/`

### Gmail API Errors

**Error:** "User not connected to Google"

**Solution:**
1. User needs to log in via Google OAuth
2. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

### Database Errors

**Error:** "Column 'totalProcessed' does not exist"

**Solution:**
```bash
npx prisma generate
npx prisma db push
```

## 📚 API Reference

### Spam Classification
```typescript
POST /api/classify/spam
{
  "from": "sender@example.com",
  "subject": "Email subject",
  "body": "Email content"
}

Response:
{
  "isSpam": false,
  "confidence": 0.95,
  "category": "work",
  "usedBert": true
}
```

### Priority Classification
```typescript
POST /api/classify/priority
{
  "from": "boss@company.com",
  "subject": "Urgent: Review needed",
  "body": "Please review ASAP"
}

Response:
{
  "priority": "HIGH",
  "score": 3,
  "category": "work",
  "usedBert": true
}
```

## 🎨 UI Integration

The system works automatically in the background. Users see:
- ✅ Spam emails filtered from inbox
- 🏷️ High-priority emails labeled
- 📊 Email statistics updated in real-time

## 🔐 Security

- ✅ OAuth tokens encrypted in database
- ✅ Gmail API uses official SDK
- ✅ Rate limiting on classification endpoints
- ✅ User isolation (can't access others' emails)

## 🚀 Production Deployment

### Recommended Setup

1. **BERT Server:** Deploy on separate instance/container
2. **Background Processor:** Run as systemd service or Docker container
3. **Database:** Use connection pooling
4. **Monitoring:** Add logging service (e.g., Sentry)

### Environment Variables for Production

```env
ML_SERVER_URL="https://bert-api.yourdomain.com"
NODE_ENV="production"
```

## 📞 Support

For issues or questions:
1. Check console logs for error messages
2. Verify BERT server is running (`/health` endpoint)
3. Check database connection
4. Review Gmail API quotas

---

**Built with:** Next.js 15, TypeScript, BERT (DistilBERT), Python FastAPI, Gmail API, Prisma
