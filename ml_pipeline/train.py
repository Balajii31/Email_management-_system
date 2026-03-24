"""
=============================================================
 PHASE 4 — Training Loop with Early-Stopping + Checkpointing
=============================================================
"""

import os
import time
import logging
import torch
from pathlib import Path
from torch.optim import AdamW
from transformers import get_linear_schedule_with_warmup
from sklearn.metrics import (accuracy_score, f1_score,
                              classification_report, confusion_matrix)
import numpy as np

from model   import EmailBERT, MultiTaskLoss, get_tokenizer
from dataset import get_dataloaders

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
DATA_DIR    = Path(r"C:/Users/Balaji G/Downloads/email-management-system/ml_pipeline/data")
MODELS_DIR  = Path(r"C:/Users/Balaji G/Downloads/email-management-system/ml_pipeline/saved_models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

EPOCHS          = 5
LR              = 2e-5
WARMUP_RATIO    = 0.1
PATIENCE        = 2          # early stopping patience
GRAD_CLIP       = 1.0
DEVICE          = torch.device("cuda" if torch.cuda.is_available() else "cpu")

log.info(f"Training on: {DEVICE}")


# ── Metrics ───────────────────────────────────────────────────────────────────
def evaluate(model, dataloader, loss_fn):
    model.eval()
    total_loss = 0.0
    spam_preds, spam_true = [], []
    cat_preds,  cat_true  = [], []
    pri_preds,  pri_true  = [], []

    with torch.no_grad():
        for batch in dataloader:
            ids   = batch["input_ids"].to(DEVICE)
            mask  = batch["attention_mask"].to(DEVICE)
            sl    = batch["spam_label"].to(DEVICE)
            cl    = batch["cat_label"].to(DEVICE)
            pl    = batch["pri_label"].to(DEVICE)

            s_logit, c_logit, p_logit = model(ids, mask)
            loss, *_ = loss_fn(s_logit, sl, c_logit, cl, p_logit, pl)
            total_loss += loss.item()

            spam_preds.extend(s_logit.argmax(1).cpu().numpy())
            spam_true.extend(sl.cpu().numpy())
            cat_preds.extend(c_logit.argmax(1).cpu().numpy())
            cat_true.extend(cl.cpu().numpy())
            pri_preds.extend(p_logit.argmax(1).cpu().numpy())
            pri_true.extend(pl.cpu().numpy())

    return {
        "loss":          total_loss / len(dataloader),
        "spam_acc":      accuracy_score(spam_true, spam_preds),
        "spam_f1":       f1_score(spam_true, spam_preds, average="binary"),
        "cat_f1":        f1_score(cat_true,  cat_preds,  average="weighted"),
        "pri_f1":        f1_score(pri_true,  pri_preds,  average="weighted"),
    }, spam_true, spam_preds, cat_true, cat_preds, pri_true, pri_preds


# ── Training ──────────────────────────────────────────────────────────────────
def train():
    tokenizer   = get_tokenizer()
    train_dl, val_dl, test_dl = get_dataloaders(str(DATA_DIR), tokenizer)

    model   = EmailBERT().to(DEVICE)
    loss_fn = MultiTaskLoss().to(DEVICE)

    # Separate LR for backbone vs heads
    backbone_params = [p for n, p in model.named_parameters()
                       if "bert" in n and p.requires_grad]
    head_params     = [p for n, p in model.named_parameters()
                       if "bert" not in n]

    optimizer = AdamW([
        {"params": backbone_params, "lr": LR},
        {"params": head_params,     "lr": LR * 10},
    ], weight_decay=0.01)

    total_steps   = len(train_dl) * EPOCHS
    warmup_steps  = int(total_steps * WARMUP_RATIO)
    scheduler     = get_linear_schedule_with_warmup(optimizer, warmup_steps, total_steps)

    best_val_f1   = 0.0
    patience_cnt  = 0
    history       = []

    for epoch in range(1, EPOCHS + 1):
        model.train()
        train_loss = 0.0
        t0 = time.time()

        for step, batch in enumerate(train_dl, 1):
            ids   = batch["input_ids"].to(DEVICE)
            mask  = batch["attention_mask"].to(DEVICE)
            sl    = batch["spam_label"].to(DEVICE)
            cl    = batch["cat_label"].to(DEVICE)
            pl    = batch["pri_label"].to(DEVICE)

            optimizer.zero_grad()
            s_logit, c_logit, p_logit = model(ids, mask)
            loss, ls, lc, lp = loss_fn(s_logit, sl, c_logit, cl, p_logit, pl)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            optimizer.step()
            scheduler.step()
            train_loss += loss.item()

            if step % 100 == 0:
                log.info(f"  Epoch {epoch} step {step}/{len(train_dl)} "
                         f"loss={loss.item():.4f} "
                         f"(spam={ls.item():.3f} cat={lc.item():.3f} pri={lp.item():.3f})")

        elapsed  = time.time() - t0
        avg_loss = train_loss / len(train_dl)
        val_metrics, *_ = evaluate(model, val_dl, loss_fn)

        log.info(
            f"\n{'-'*65}\n"
            f"  Epoch {epoch}/{EPOCHS}  ({elapsed:.0f}s)\n"
            f"  Train loss: {avg_loss:.4f}\n"
            f"  Val   loss: {val_metrics['loss']:.4f}\n"
            f"  Val spam acc={val_metrics['spam_acc']:.4f}  F1={val_metrics['spam_f1']:.4f}\n"
            f"  Val category F1={val_metrics['cat_f1']:.4f}\n"
            f"  Val priority F1={val_metrics['pri_f1']:.4f}\n"
            f"{'-'*65}"
        )

        # Composite score: spam F1 has highest weight
        composite = (0.6 * val_metrics["spam_f1"] +
                     0.25 * val_metrics["cat_f1"] +
                     0.15 * val_metrics["pri_f1"])

        history.append({**val_metrics, "epoch": epoch, "train_loss": avg_loss, "composite": composite})

        if composite > best_val_f1:
            best_val_f1  = composite
            patience_cnt = 0
            torch.save({
                "epoch":       epoch,
                "model_state": model.state_dict(),
                "optimizer":   optimizer.state_dict(),
                "val_metrics": val_metrics,
            }, MODELS_DIR / "best_model.pt")
            log.info(f"  [BEST] New best model saved (composite={composite:.4f})")
        else:
            patience_cnt += 1
            log.info(f"  No improvement ({patience_cnt}/{PATIENCE})")
            if patience_cnt >= PATIENCE:
                log.info("  Early stopping triggered.")
                break

    # ── Final evaluation on test set ──────────────────────────────────────────
    log.info("\n" + "="*65 + "\n  FINAL TEST EVALUATION\n" + "="*65)
    ckpt = torch.load(MODELS_DIR / "best_model.pt", map_location=DEVICE)
    model.load_state_dict(ckpt["model_state"])

    test_metrics, s_true, s_pred, c_true, c_pred, p_true, p_pred = evaluate(model, test_dl, loss_fn)

    spam_names = ["ham", "spam"]
    cat_names  = ["personal", "promotions", "spam", "work"]
    pri_names  = ["Low", "Medium", "High"]

    log.info(f"\n[SPAM DETECTION]\n{classification_report(s_true, s_pred, target_names=spam_names)}")
    log.info(f"\n[CATEGORY CLASSIFICATION]\n{classification_report(c_true, c_pred, target_names=cat_names)}")
    log.info(f"\n[PRIORITY SCORING]\n{classification_report(p_true, p_pred, target_names=pri_names)}")

    log.info(f"\nTest composite score: "
             f"{0.6*test_metrics['spam_f1'] + 0.25*test_metrics['cat_f1'] + 0.15*test_metrics['pri_f1']:.4f}")

    # Save history
    import json
    with open(MODELS_DIR / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)
    log.info("Training history saved.")

    # Save tokenizer for inference
    tokenizer.save_pretrained(str(MODELS_DIR / "tokenizer"))
    log.info("Tokenizer saved.")

    return model, tokenizer


if __name__ == "__main__":
    train()
