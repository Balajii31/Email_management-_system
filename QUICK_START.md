# 🚀 Quick Start Guide - Email Spam Detection System

## ⚡ Fast Setup (5 minutes)

### Prerequisites
- Node.js 18+ installed
- Python 3.8+ installed  
- PostgreSQL database (already configured)
- Gmail account for testing

### Step 1: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd ml_pipeline
pip install -r requirements.txt
cd ..
```

### Step 2: Setup Database

```bash
npm run db:migrate
```

This will:
- Generate Prisma client
- Push schema changes to database
- Create necessary tables

### Step 3: Check Your BERT Model

Make sure you have the trained model files:
- `ml_pipeline/saved_models/best_model.pt`
- `ml_pipeline/saved_models/tokenizer/`

**Don't have the model yet?**
1. Open `ml_pipeline/Email_BERT_Training.ipynb` in Colab
2. Run all cells to train the model
3. Download `best_model.pt` and `tokenizer/` folder
4. Place them in `ml_pipeline/saved_models/`

### Step 4: Start Services

**Terminal 1: Start BERT ML Server**
```bash
npm run ml:serve
```

Wait for: `✅ EmailClassifier loaded successfully`

**Terminal 2: Start Next.js App**
```bash
npm run dev
```

App will be at `http://localhost:3000`

**Terminal 3 (Optional): Start Background Email Processor**
```bash
npm run email:processor
```

### Step 5: Test the System

```bash
npm run email:test
```

You should see:
```
✅ BERT server is healthy and model is loaded
✅ Spam detection working
✅ Classification time: <500ms
```

### Step 6: Use the Application

1. Open `http://localhost:3000`
2. Click "Sign in with Google"
3. Authorize Gmail access
4. Click "Sync Emails" button
5. Watch as:
   - Spam emails are detected and moved to spam folder
   - Priority emails are labeled
   - All emails appear in your inbox

## 📊 What Happens Now?

### Automatic Processing

Every email that arrives will be:

1. **Fetched** from Gmail (every 5 minutes with background processor)
2. **Analyzed** by BERT AI model
3. **Classified:**
   - ✅ **Spam?** → Moved to Gmail spam folder
   - ✅ **Priority?** → Labeled as High/Medium/Low
   - ✅ **Category?** → Tagged as work/personal/social/etc.
4. **Saved** to database for quick access

### Manual Sync

You can also manually trigger sync anytime:
- Click "Sync Emails" button in the UI
- Or call `POST /api/emails/sync`

## 🔍 Verify It's Working

### Check BERT Server
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "ok",
  "model_loaded": true
}
```

### Test Spam Detection
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "WIN FREE PRIZES NOW!!!", "subject": "You Won!"}'
```

Should return `is_spam: true`

### Check Database
```bash
npx prisma studio
```

Browse your emails and see classifications!

## 🎯 Common Issues

### Issue: BERT server shows "Model not loaded"

**Solution:**
1. Check if `ml_pipeline/saved_models/best_model.pt` exists
2. If not, train the model using the Jupyter notebook
3. Make sure you're in the `ml_pipeline` folder when running `python serve.py`

### Issue: Gmail sync fails with "User not connected"

**Solution:**
1. Log in to the app with Google OAuth first
2. Check your Google API credentials in `.env`
3. Make sure Gmail API is enabled in Google Cloud Console

### Issue: Background processor not detecting new emails

**Solution:**
1. Check if processor is running: `npm run email:processor`
2. Verify it shows "BERT Status: ✅ Available"
3. Check logs for any errors

### Issue: Next.js app won't start

**Solution:**
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

## 📚 Next Steps

1. **Customize Settings:**
   - Edit `scripts/email-processor.ts` to change poll interval
   - Modify spam threshold in BERT model
   - Add custom priority rules

2. **Train Better Model:**
   - Collect more training data
   - Fine-tune BERT on your specific email patterns
   - Adjust classification thresholds

3. **Add Features:**
   - Email auto-reply for certain categories
   - Smart email summarization
   - Automatic email forwarding rules
   - Email templates based on priority

4. **Deploy to Production:**
   - Set up BERT server on cloud (AWS/GCP/Azure)
   - Configure database backups
   - Add monitoring and alerts
   - Set up SSL certificates

## 🎉 You're Done!

Your email spam detection and prioritization system is now running!

Every email will be automatically:
- ✅ Scanned for spam
- ✅ Classified by priority
- ✅ Organized in your inbox
- ✅ Protected by AI

---

**Need help?** Check [SPAM_DETECTION_GUIDE.md](./SPAM_DETECTION_GUIDE.md) for detailed documentation.

**Want to customize?** See the architecture section in the guide.
