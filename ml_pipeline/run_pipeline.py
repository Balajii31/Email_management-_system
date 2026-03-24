"""
=============================================================
 RUN_PIPELINE.py — Master Runner
 Execute all phases in order:
   1. Data Preparation
   2. Train BERT model
   3. Run demo inference
   4. Generate HTML report
=============================================================
"""

import sys
import os

# Add ml_pipeline dir to path
sys.path.insert(0, os.path.dirname(__file__))

print("\n" + "="*65)
print("  BERT EMAIL CLASSIFIER -- FULL PIPELINE")
print("="*65 + "\n")

# ── Phase 1: Data Preparation ─────────────────────────────────────────────────
print(">>  PHASE 1: Data Preparation")
print("-"*65)
from data_preparation import build_dataset
build_dataset(max_per_split=40_000)

# ── Phase 2: Train ────────────────────────────────────────────────────────────
print("\n>>  PHASE 2: Training Multi-Task BERT")
print("-"*65)
from train import train
model, tokenizer = train()

# ── Phase 3: Demo Inference ───────────────────────────────────────────────────
print("\n>>  PHASE 3: Demo Inference")
print("-"*65)
from inference import EmailClassifier
clf = EmailClassifier()

test_emails = [
    "Congratulations! You've won a £1,000 prize. Click HERE to claim!",
    "Hi team, budget report is due by end of day. Please respond urgently.",
    "Weekend sale — 50% off everything! Limited stock. Buy now!",
    "Hey! Are you free for lunch tomorrow? Let me know.",
    "URGENT: Suspicious login detected on your account. Verify now.",
    "Please find attached the Q4 performance metrics for your review.",
]

print(f"\n{'Email':<55} {'Spam':^10} {'Category':^12} {'Priority':^10}")
print("-"*90)
for email in test_emails:
    r = clf.predict(email)
    label = f"{r['spam']} ({r['spam_confidence']*100:.0f}%)"
    print(f"{email[:54]:<55} {label:^15} {r['category']:^12} {r['priority']:^10}")

# ── Phase 4: Visual Report ────────────────────────────────────────────────────
print("\n>>  PHASE 4: Generating Training Report")
print("-"*65)
from visualize import generate_report
generate_report()

print("\n" + "="*65)
print("  [DONE] PIPELINE COMPLETE!")
print("  Model  : ml_pipeline/saved_models/best_model.pt")
print("  Report : ml_pipeline/saved_models/training_report.html")
print("="*65 + "\n")
