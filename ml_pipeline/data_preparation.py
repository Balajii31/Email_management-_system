"""
=============================================================
 PHASE 1 — Data Preparation
 Loads & merges 4 email datasets into a single clean DataFrame
 Columns produced:
   text   : cleaned email body / subject
   label  : 0 = ham, 1 = spam
   category : coarse category (spam / work / personal / promo)
   priority : 1-Low, 2-Medium, 3-High
=============================================================
"""

import re
import os
import logging
import pandas as pd
import numpy as np
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────────
DATASET_DIR  = Path(r"C:/Users/Balaji G/Downloads/email_dataset")
OUTPUT_DIR   = Path(r"C:/Users/Balaji G/Downloads/email-management-system/ml_pipeline/data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ── Text cleaning ─────────────────────────────────────────────────────────────
_URL_RE    = re.compile(r"http\S+|www\.\S+")
_EMAIL_RE  = re.compile(r"\S+@\S+")
_HTML_RE   = re.compile(r"<[^>]+>")
_SPACE_RE  = re.compile(r"\s+")

def clean_text(text: str) -> str:
    text = str(text)
    text = _HTML_RE.sub(" ", text)
    text = _URL_RE.sub(" URL ", text)
    text = _EMAIL_RE.sub(" EMAIL ", text)
    text = re.sub(r"[^a-zA-Z0-9\s.,!?']", " ", text)
    text = _SPACE_RE.sub(" ", text).strip()
    return text[:512]   # BERT max token guard


# ── Priority heuristic ────────────────────────────────────────────────────────
_URGENT = re.compile(
    r"\b(urgent|asap|immediately|deadline|action required|important|"
    r"confirm|verify|critical|alert|respond|due today)\b", re.I)
_PROMO  = re.compile(
    r"\b(offer|sale|discount|free|win|prize|click|subscribe|unsubscribe|"
    r"limited time|deal|buy now|order now)\b", re.I)

def assign_priority(row) -> int:
    """1=Low, 2=Medium, 3=High"""
    if row["label"] == 1:          # spam → always Low
        return 1
    text = str(row["text"])
    if _URGENT.search(text):
        return 3
    if _PROMO.search(text):
        return 1
    return 2


# ── Category heuristic ────────────────────────────────────────────────────────
def assign_category(row) -> str:
    if row["label"] == 1:
        return "spam"
    text = str(row["text"]).lower()
    if _URGENT.search(text) or any(w in text for w in
            ("meeting", "project", "report", "deadline", "invoice",
             "client", "budget", "schedule", "conference")):
        return "work"
    if _PROMO.search(text) or any(w in text for w in
            ("offer", "sale", "discount", "newsletter", "promo")):
        return "promotions"
    return "personal"


# ═══════════════════════════════════════════════════════════════════════════════
#  Dataset loaders
# ═══════════════════════════════════════════════════════════════════════════════

def load_spam_sms() -> pd.DataFrame:
    """Dataset 1 — spam.csv (SMS Spam Collection, ~5 572 rows)"""
    path = DATASET_DIR / "spam.csv"
    df   = pd.read_csv(path, encoding="latin-1")[["v1", "v2"]]
    df.columns = ["raw_label", "text"]
    df["label"] = (df["raw_label"].str.lower().str.strip() == "spam").astype(int)
    df.drop(columns=["raw_label"], inplace=True)
    log.info(f"[spam.csv]         {len(df):>7,} rows  |  spam={df['label'].sum():,}")
    return df


def load_spam_assassin() -> pd.DataFrame:
    """Dataset 2 — spam_assassin.csv (~6 000 rows)"""
    path = DATASET_DIR / "spam_assassin.csv"
    df   = pd.read_csv(path, encoding="latin-1")

    # Flexible column detection
    text_col  = next((c for c in df.columns if "text" in c.lower()), None)
    label_col = next((c for c in df.columns if "label" in c.lower()
                      or "class" in c.lower() or "target" in c.lower()), None)

    if text_col is None or label_col is None:
        # Last-resort: assume last col = label, everything else joined
        label_col = df.columns[-1]
        text_col  = "text"
        df[text_col] = df.iloc[:, :-1].astype(str).agg(" ".join, axis=1)

    df = df[[text_col, label_col]].copy()
    df.columns = ["text", "label"]

    # Normalise label to 0/1
    unique = df["label"].dropna().unique()
    if set(unique).issubset({"spam", "ham", "0", "1", 0, 1}):
        df["label"] = df["label"].apply(
            lambda x: 1 if str(x).lower() in ("spam", "1") else 0)
    else:
        df["label"] = pd.to_numeric(df["label"], errors="coerce").fillna(0).astype(int)

    log.info(f"[spam_assassin.csv] {len(df):>7,} rows  |  spam={df['label'].sum():,}")
    return df


def load_combined() -> pd.DataFrame:
    """Dataset 3 — combined_data.csv (label + text)"""
    path = DATASET_DIR / "combined_data.csv"
    df   = pd.read_csv(path, encoding="latin-1")[["label", "text"]]
    df["label"] = pd.to_numeric(df["label"], errors="coerce").fillna(0).astype(int)
    df["label"] = df["label"].clip(0, 1)
    log.info(f"[combined_data.csv] {len(df):>7,} rows  |  spam={df['label'].sum():,}")
    return df


def load_enron() -> pd.DataFrame:
    """Dataset 4 — emails.csv (Enron, file + message)
    We take a 30 000 row sample; all are ham (label=0).
    """
    path  = DATASET_DIR / "emails.csv"
    SAMPLE = 30_000
    df    = pd.read_csv(path, encoding="latin-1", usecols=["message"],
                        nrows=SAMPLE)
    df.rename(columns={"message": "text"}, inplace=True)
    df["label"] = 0           # Enron = all ham

    # Strip email headers — keep body only
    def strip_headers(msg: str) -> str:
        parts = str(msg).split("\n\n", 1)
        return parts[1] if len(parts) > 1 else parts[0]

    df["text"] = df["text"].apply(strip_headers)
    log.info(f"[emails.csv]       {len(df):>7,} rows  |  spam={df['label'].sum():,}")
    return df


# ═══════════════════════════════════════════════════════════════════════════════
#  Main pipeline
# ═══════════════════════════════════════════════════════════════════════════════

def build_dataset(max_per_split: int = 50_000) -> pd.DataFrame:
    frames = [
        load_spam_sms(),
        load_spam_assassin(),
        load_combined(),
        load_enron(),
    ]
    df = pd.concat(frames, ignore_index=True)
    log.info(f"Combined raw:       {len(df):>7,} rows")

    # Clean
    df["text"]  = df["text"].apply(clean_text)
    df          = df[df["text"].str.len() > 10].copy()

    # Deduplicate
    df.drop_duplicates(subset=["text"], inplace=True)
    log.info(f"After dedup/clean:  {len(df):>7,} rows")

    # Balance classes (upsample minority if needed)
    ham_df  = df[df["label"] == 0]
    spam_df = df[df["label"] == 1]
    log.info(f"Ham: {len(ham_df):,}  |  Spam: {len(spam_df):,}")

    # Cap to manageable size
    ham_df  = ham_df.sample(min(len(ham_df),  max_per_split), random_state=42)
    spam_df = spam_df.sample(min(len(spam_df), max_per_split), random_state=42)
    df = pd.concat([ham_df, spam_df], ignore_index=True)

    # Assign categories and priority
    df["category"] = df.apply(assign_category, axis=1)
    df["priority"] = df.apply(assign_priority, axis=1)

    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Train / Val / Test split  80 / 10 / 10
    n      = len(df)
    t1, t2 = int(n * 0.80), int(n * 0.90)
    train  = df.iloc[:t1]
    val    = df.iloc[t1:t2]
    test   = df.iloc[t2:]

    train.to_csv(OUTPUT_DIR / "train.csv", index=False)
    val.to_csv(OUTPUT_DIR  / "val.csv",   index=False)
    test.to_csv(OUTPUT_DIR / "test.csv",  index=False)

    log.info(f"Train: {len(train):,}  |  Val: {len(val):,}  |  Test: {len(test):,}")
    log.info(f"Saved to {OUTPUT_DIR}")

    # Category & priority distribution
    log.info("\nCategory distribution (train):\n" + str(train["category"].value_counts()))
    log.info("\nPriority distribution (train):\n" + str(train["priority"].value_counts()))

    return df


if __name__ == "__main__":
    build_dataset()
