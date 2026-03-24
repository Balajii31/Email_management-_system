"""
=============================================================
 PHASE 3 — PyTorch Dataset + DataLoader
=============================================================
"""

import torch
import pandas as pd
from torch.utils.data import Dataset, DataLoader
from transformers import DistilBertTokenizerFast

from model import CATEGORY_TO_IDX, PRIORITY_TO_IDX

MAX_LEN    = 128
BATCH_SIZE = 16


class EmailDataset(Dataset):

    def __init__(self, csv_path: str, tokenizer: DistilBertTokenizerFast):
        df = pd.read_csv(csv_path)

        # ── Validate & coerce columns ─────────────────────────────────────────
        df["text"]     = df["text"].fillna("").astype(str)
        df["label"]    = pd.to_numeric(df["label"],    errors="coerce").fillna(0).astype(int)
        df["category"] = df["category"].fillna("personal")
        df["priority"] = pd.to_numeric(df["priority"], errors="coerce").fillna(2).astype(int)

        self.texts     = df["text"].tolist()
        self.spam_lbl  = df["label"].tolist()
        self.cat_lbl   = [CATEGORY_TO_IDX.get(c, 0) for c in df["category"]]
        # priority stored as 1/2/3 → convert to 0/1/2
        self.pri_lbl   = [min(max(int(p) - 1, 0), 2)  for p in df["priority"]]
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        enc = self.tokenizer(
            self.texts[idx],
            max_length=MAX_LEN,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids":      enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "spam_label":     torch.tensor(self.spam_lbl[idx], dtype=torch.long),
            "cat_label":      torch.tensor(self.cat_lbl[idx],  dtype=torch.long),
            "pri_label":      torch.tensor(self.pri_lbl[idx],  dtype=torch.long),
        }


def get_dataloaders(data_dir: str, tokenizer, num_workers: int = 0):
    from pathlib import Path
    d = Path(data_dir)
    train_ds = EmailDataset(str(d / "train.csv"), tokenizer)
    val_ds   = EmailDataset(str(d / "val.csv"),   tokenizer)
    test_ds  = EmailDataset(str(d / "test.csv"),  tokenizer)

    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,
                          num_workers=num_workers, pin_memory=False)
    val_dl   = DataLoader(val_ds,   batch_size=BATCH_SIZE * 2, shuffle=False,
                          num_workers=num_workers)
    test_dl  = DataLoader(test_ds,  batch_size=BATCH_SIZE * 2, shuffle=False,
                          num_workers=num_workers)

    return train_dl, val_dl, test_dl
