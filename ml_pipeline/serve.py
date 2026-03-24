"""
=============================================================
 PHASE 6 — FastAPI Inference Server
 Serves the trained EmailBERT model over HTTP so the
 Next.js app can call it at http://localhost:8000
 
 Endpoints:
   POST /predict        { "text": "..." }
   POST /predict/batch  { "texts": ["...", "..."] }
   GET  /health
=============================================================
"""

import sys
import os
from pathlib import Path

# Ensure ml_pipeline modules are importable
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import torch

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Email AI Classifier",
    description="BERT-powered spam detection, category classification, and priority scoring",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model loading ─────────────────────────────────────────────────────────────
classifier = None

def load_model():
    global classifier
    try:
        from inference import EmailClassifier
        classifier = EmailClassifier()
        print("✅ EmailClassifier loaded successfully")
    except FileNotFoundError:
        print("⚠️  WARNING: No trained model found at ml_pipeline/saved_models/best_model.pt")
        print("   Please train the model first using the Colab notebook,")
        print("   then place best_model.pt and tokenizer/ in ml_pipeline/saved_models/")
        classifier = None
    except Exception as e:
        print(f"⚠️  WARNING: Failed to load model: {e}")
        classifier = None

@app.on_event("startup")
async def startup_event():
    load_model()


# ── Schemas ───────────────────────────────────────────────────────────────────
class EmailRequest(BaseModel):
    text: str
    subject: Optional[str] = ""

class BatchEmailRequest(BaseModel):
    texts: List[str]

class PredictionResponse(BaseModel):
    spam: str
    is_spam: bool
    spam_confidence: float
    category: str
    category_scores: dict
    priority: str
    priority_score: int
    priority_scores: dict


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": classifier is not None,
        "device": str(torch.device("cuda" if torch.cuda.is_available() else "cpu")),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(req: EmailRequest):
    if classifier is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Train the model first using the Colab notebook."
        )
    combined = f"{req.subject} {req.text}".strip() if req.subject else req.text
    try:
        result = classifier.predict(combined)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch")
def predict_batch(req: BatchEmailRequest):
    if classifier is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Train the model first using the Colab notebook."
        )
    if len(req.texts) > 100:
        raise HTTPException(status_code=400, detail="Max 100 texts per batch")
    try:
        results = classifier.predict_batch(req.texts)
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/spam-only")
def predict_spam(req: EmailRequest):
    """Lightweight endpoint — returns only spam prediction."""
    result = predict(req)
    return {
        "is_spam": result["is_spam"],
        "label": result["spam"],
        "confidence": result["spam_confidence"],
    }


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  Email AI Classifier — FastAPI Server")
    print("  http://localhost:8000")
    print("  Docs: http://localhost:8000/docs")
    print("="*60 + "\n")
    uvicorn.run("serve:app", host="0.0.0.0", port=8000, reload=False)
