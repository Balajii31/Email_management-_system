"""
=============================================================
 PHASE 5 — Inference Engine
 Load trained model → predict spam / category / priority
 Can be imported by FastAPI or Next.js Python backend
=============================================================
"""

import torch
import json
from pathlib import Path
from transformers import DistilBertTokenizerFast

from model import EmailBERT, SPAM_LABELS, CATEGORY_LABELS, PRIORITY_LABELS

MODELS_DIR = Path(r"C:/Users/Balaji G/Downloads/email-management-system/ml_pipeline/saved_models")
MAX_LEN    = 128
DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class EmailClassifier:
    """
    High-level inference wrapper.

    Usage
    -----
    clf = EmailClassifier()
    result = clf.predict("Congratulations! You've won a prize. Click here!")
    print(result)
    # {'spam': 'spam', 'spam_confidence': 0.98,
    #  'category': 'spam', 'priority': 'Low', 'priority_score': 1}
    """

    def __init__(self):
        self.model     = EmailBERT().to(DEVICE)
        ckpt           = torch.load(MODELS_DIR / "best_model.pt", map_location=DEVICE)
        self.model.load_state_dict(ckpt["model_state"])
        self.model.eval()

        # Try loading fine-tuned tokenizer, fall back to pretrained
        tok_path = MODELS_DIR / "tokenizer"
        if tok_path.exists():
            self.tokenizer = DistilBertTokenizerFast.from_pretrained(str(tok_path))
        else:
            from model import get_tokenizer
            self.tokenizer = get_tokenizer()

        print(f"EmailClassifier loaded on {DEVICE}")

    @torch.no_grad()
    def predict(self, text: str) -> dict:
        enc = self.tokenizer(
            text,
            max_length=MAX_LEN,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        ids  = enc["input_ids"].to(DEVICE)
        mask = enc["attention_mask"].to(DEVICE)

        s_logit, c_logit, p_logit = self.model(ids, mask)

        s_prob = torch.softmax(s_logit, dim=-1)[0]
        c_prob = torch.softmax(c_logit, dim=-1)[0]
        p_prob = torch.softmax(p_logit, dim=-1)[0]

        spam_idx = s_prob.argmax().item()
        cat_idx  = c_prob.argmax().item()
        pri_idx  = p_prob.argmax().item()

        return {
            "spam":              SPAM_LABELS[spam_idx],
            "is_spam":           bool(spam_idx == 1),
            "spam_confidence":   round(s_prob[spam_idx].item(), 4),
            "category":          CATEGORY_LABELS[cat_idx],
            "category_scores":   {CATEGORY_LABELS[i]: round(v, 4)
                                   for i, v in enumerate(c_prob.tolist())},
            "priority":          PRIORITY_LABELS[pri_idx],
            "priority_score":    pri_idx + 1,   # 1/2/3
            "priority_scores":   {PRIORITY_LABELS[i]: round(v, 4)
                                   for i, v in enumerate(p_prob.tolist())},
        }

    @torch.no_grad()
    def predict_batch(self, texts: list[str]) -> list[dict]:
        results = []
        # Process in chunks of 32
        for i in range(0, len(texts), 32):
            chunk = texts[i:i+32]
            enc   = self.tokenizer(
                chunk,
                max_length=MAX_LEN,
                padding=True,
                truncation=True,
                return_tensors="pt",
            )
            ids  = enc["input_ids"].to(DEVICE)
            mask = enc["attention_mask"].to(DEVICE)

            s_logit, c_logit, p_logit = self.model(ids, mask)
            s_probs = torch.softmax(s_logit, dim=-1)
            c_probs = torch.softmax(c_logit, dim=-1)
            p_probs = torch.softmax(p_logit, dim=-1)

            for j in range(len(chunk)):
                si = s_probs[j].argmax().item()
                ci = c_probs[j].argmax().item()
                pi = p_probs[j].argmax().item()
                results.append({
                    "text_preview":    chunk[j][:80] + "...",
                    "spam":            SPAM_LABELS[si],
                    "is_spam":         bool(si == 1),
                    "spam_confidence": round(s_probs[j][si].item(), 4),
                    "category":        CATEGORY_LABELS[ci],
                    "priority":        PRIORITY_LABELS[pi],
                    "priority_score":  pi + 1,
                })
        return results


# ── CLI demo ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    clf = EmailClassifier()

    samples = [
        "Congratulations! You've won £1,000. Click HERE to claim your prize now!",
        "Hi team, the quarterly budget report is due by end of day today. Please respond.",
        "Get 50% off on all items this weekend! Limited offer. Subscribe now.",
        "Hey! Are you free for lunch tomorrow? Let me know.",
        "URGENT: Your account has been compromised. Verify immediately.",
    ]

    print("\n" + "="*70)
    print("  EMAIL CLASSIFIER — DEMO")
    print("="*70)
    for txt in samples:
        r = clf.predict(txt)
        print(f"\n  📧 {txt[:60]}...")
        print(f"     Spam      : {r['spam']} ({r['spam_confidence']*100:.1f}%)")
        print(f"     Category  : {r['category']}")
        print(f"     Priority  : {r['priority']} ({r['priority_score']}/3)")
