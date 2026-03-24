"""
=============================================================
 PHASE 2 — Multi-Task BERT Model
 Three output heads on top of a shared DistilBERT encoder:
   ① spam_head    : binary  (ham / spam)
   ② category_head: 4-class (spam / work / personal / promotions)
   ③ priority_head : 3-class (Low=1 / Medium=2 / High=3)
=============================================================
"""

import torch
import torch.nn as nn
from transformers import DistilBertModel, DistilBertTokenizerFast

# Labels
SPAM_LABELS     = {0: "ham",        1: "spam"}
CATEGORY_LABELS = {0: "personal",   1: "promotions", 2: "spam", 3: "work"}
PRIORITY_LABELS = {0: "Low",        1: "Medium",      2: "High"}

# Reverse maps (used during training)
CATEGORY_TO_IDX = {v: k for k, v in CATEGORY_LABELS.items()}
PRIORITY_TO_IDX = {"Low": 0, "Medium": 1, "High": 2}  # map 1/2/3 → 0/1/2

MODEL_NAME = "distilbert-base-uncased"   # fast & accurate; swap to bert-base-uncased if you prefer


class EmailBERT(nn.Module):
    """
    Multi-task classifier built on DistilBERT.

    Architecture
    ────────────
    DistilBERT backbone (shared)
        │
        ├─► [CLS] pooled → Dropout → spam_head     (2 logits)
        ├─► [CLS] pooled → Dropout → category_head (4 logits)
        └─► [CLS] pooled → Dropout → priority_head (3 logits)
    """

    def __init__(
        self,
        n_spam_classes: int     = 2,
        n_category_classes: int = 4,
        n_priority_classes: int = 3,
        dropout: float          = 0.3,
        freeze_bert_layers: int = 4,   # freeze bottom N distilBERT layers
    ):
        super().__init__()
        self.bert = DistilBertModel.from_pretrained(MODEL_NAME)

        # Optionally freeze lower layers to speed up training
        if freeze_bert_layers > 0:
            for i, layer in enumerate(self.bert.transformer.layer):
                if i < freeze_bert_layers:
                    for param in layer.parameters():
                        param.requires_grad = False

        hidden = self.bert.config.hidden_size   # 768

        self.dropout = nn.Dropout(dropout)

        # Task heads
        self.spam_head = nn.Sequential(
            nn.Linear(hidden, 256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, n_spam_classes),
        )
        self.cat_head = nn.Sequential(
            nn.Linear(hidden, 256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, n_category_classes),
        )
        self.pri_head = nn.Sequential(
            nn.Linear(hidden, 128),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(128, n_priority_classes),
        )

    def forward(
        self,
        input_ids:      torch.Tensor,
        attention_mask: torch.Tensor,
    ):
        outputs  = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled   = outputs.last_hidden_state[:, 0, :]   # [CLS] token
        pooled   = self.dropout(pooled)

        spam_logits = self.spam_head(pooled)
        cat_logits  = self.cat_head(pooled)
        pri_logits  = self.pri_head(pooled)

        return spam_logits, cat_logits, pri_logits


# ── Loss helper ────────────────────────────────────────────────────────────────

class MultiTaskLoss(nn.Module):
    """
    Weighted sum of three cross-entropy losses.
    Spam detection gets double weight as it's the most critical task.
    """

    def __init__(self, spam_w=2.0, cat_w=1.0, pri_w=1.0):
        super().__init__()
        self.spam_w = spam_w
        self.cat_w  = cat_w
        self.pri_w  = pri_w
        self.ce     = nn.CrossEntropyLoss()

    def forward(
        self,
        spam_logits,     spam_labels,
        cat_logits,      cat_labels,
        pri_logits,      pri_labels,
    ):
        loss_spam = self.ce(spam_logits, spam_labels)
        loss_cat  = self.ce(cat_logits,  cat_labels)
        loss_pri  = self.ce(pri_logits,  pri_labels)
        total = (self.spam_w * loss_spam +
                 self.cat_w  * loss_cat  +
                 self.pri_w  * loss_pri)
        return total, loss_spam, loss_cat, loss_pri


# ── Tokenizer helper ──────────────────────────────────────────────────────────

def get_tokenizer():
    return DistilBertTokenizerFast.from_pretrained(MODEL_NAME)


if __name__ == "__main__":
    tok   = get_tokenizer()
    model = EmailBERT()
    sample = tok(["Hello, is this spam?", "Meeting at 3pm tomorrow"],
                 return_tensors="pt", padding=True, truncation=True, max_length=128)
    s, c, p = model(**sample)
    print("spam logits   :", s.shape)      # (2, 2)
    print("category logits:", c.shape)     # (2, 4)
    print("priority logits:", p.shape)     # (2, 3)
    print("Model OK [PASS]")
