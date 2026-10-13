# ESS Sales AI: Training Datasets & Preprocessing Artifacts

This directory contains the reproducible supervised fine-tuning (SFT) corpora and evaluation datasets for the Emperor Smart Solutions (ESS) AI Sales Agent.

---

## Directory Contents

```
data/training/
├── README.md
└── ess-sales/
    ├── source_manifest.json          # Source commit SHA, URL, and SHA256 checksum
    ├── data_quality_report.json      # Comprehensive statistical and synthetic artifact audit
    ├── raw_examples.jsonl            # Exact raw parquet rows preserved unchanged (28.6 MB)
    ├── normalized_examples.jsonl     # Extracted multi-turn context and target responses (24.8 MB)
    ├── filtered_examples.jsonl       # Consultative B2B tech records (consumer gadgets pruned) (30.0 MB)
    ├── train.jsonl                   # Leakage-free training split: 14,885 turns / 1,338 conversations (22.9 MB)
    ├── validation.jsonl              # Leakage-free validation split: 1,775 turns / 167 conversations (2.7 MB)
    ├── test.jsonl                    # Held-out evaluation split: 2,956 turns / 168 conversations (4.4 MB)
    └── preprocessing_report.json     # Turn count verification and leakage-prevention audit
```

---

## Pipeline Execution

To regenerate or re-verify all artifacts:

```bash
# 1. Download and deeply audit Hugging Face dataset (goendalf666/sales-conversations-instruction-base)
node scripts/acquire_and_analyze_dataset.js

# 2. Filter consumer items, fuse ESS software sales dialogues, and split at conversation level
node scripts/preprocess_sales_dataset.js
```

---

## Data Provenance & Ethics
- **Source:** Hugging Face `goendalf666/sales-conversations-instruction-base` (Revision `3d723c6...`).
- **Generator:** Synthetic dialogue generated via OpenAI `gpt-3.5-turbo`.
- **License Status:** Unlabeled / "other" on Hugging Face.
- **Commercial Policy:** Kept private and internal. Used strictly for learning conversational sequencing and objection handling patterns. Factual knowledge is grounded via RAG and verified ESS documentation.
