# ESS AI Sales Agent: Training Strategy & SFT Pipeline

> **Target Base Model:** `meta-llama/Llama-3.2-1B-Instruct` or `Llama-3.2-3B-Instruct`  
> **Training Methodology:** Parameter-Efficient Supervised Fine-Tuning via QLoRA (4-bit NF4)  
> **Training Script:** `scripts/train_lora.py`  
> **Dataset Pipeline:** `scripts/acquire_and_analyze_dataset.js` & `scripts/preprocess_sales_dataset.js`  

---

## 1. When is Fine-Tuning Justified?

Fine-tuning is used strictly for **conversational style, consultative question sequencing, active listening, and concise objection handling**.

| Concern | Resolution Mechanism |
| :--- | :--- |
| Company facts, founders, office location | **RAG Retrieval** (PostgreSQL pgvector) |
| Conversation qualification steps, missing fields | **Deterministic State Machine** (`salesFlowManager.js`) |
| Lead persistence & duplicate prevention | **Idempotent Database Code** (`leadsStore.js`) |
| Business-only topic boundaries | **Intent Classifier Guardrail** (`intentClassifier.js`) |
| **Conversational tone, brevity, consultative empathy** | **Fine-Tuned Model Weights (QLoRA)** |

---

## 2. Dataset Engineering & Leakage Prevention

### A. Source Dataset Audit
- Dataset: `goendalf666/sales-conversations-instruction-base` (20,940 rows, parquet format).
- Revision Commit: `3d723c68dd3b6ac3c4c0ae021a2d3ab908c4409a`.
- Finding: 91.7% synthetic expansion inflation. Derived from ~1,744 base dialogues.
- Resolution: Grouped by unique root conversation ID to prevent turn-overlap contamination across train/validation splits. Discarded 1,338 consumer goods records.

### B. Curated ESS Software Engineering Corpus Fusion
Merged 14 specialized multi-turn dialogues covering:
- Educational ERP / School Management (attendance, fee collection, parent portal).
- Corporate Web Platforms (Next.js, Tailwind, SEO).
- Headless E-Commerce & Payment Gateways.
- Cross-Platform Mobile Apps (Flutter, GPS dispatch).
- Enterprise RAG & WhatsApp Cloud API.
- Adaptive answers: handling *"Both"*, *"Under ₹50,000"*, and changing project requirements mid-flow.

### C. Partitioning Results
- **Training Set (`train.jsonl`):** 14,885 turns (1,338 unique conversation roots, 80%)
- **Validation Set (`validation.jsonl`):** 1,775 turns (167 unique conversation roots, 10%)
- **Test Set (`test.jsonl`):** 2,956 turns (168 unique conversation roots, 10%, strictly held out)

---

## 3. QLoRA Training Configuration

```python
# Hyperparameters from scripts/train_lora.py
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True
)
```

- **Per-Device Batch Size:** 2 | **Gradient Accumulation:** 4 (Effective batch size = 8)
- **Optimizer:** `paged_adamw_8bit` | **Learning Rate:** $2 \times 10^{-4}$ (Cosine decay)
- **Epochs:** 3 with validation checkpointing every epoch
- **Hardware Requirement:** NVIDIA GPU with $\ge 12$ GB VRAM (e.g., T4 on Google Colab, A10G on AWS `g5.xlarge`, or RunPod).
- **Dry-run verification:** Validated locally via `python scripts/train_lora.py --dry_run`.
