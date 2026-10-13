#!/usr/bin/env python3
"""
Emperor Smart Solutions (ESS) — Supervised Fine-Tuning Pipeline (QLoRA)
======================================================================
Train a domain-specific, business-only sales consultant on Llama-3.2-1B-Instruct
or Llama-3.2-3B-Instruct using 4-bit NormalFloat (NF4) Quantization and Low-Rank
Adaptation (LoRA).

Dependencies:
    pip install torch transformers peft trl datasets bitsandbytes accelerate

Usage:
    python scripts/train_lora.py \
        --base_model "meta-llama/Llama-3.2-1B-Instruct" \
        --train_file "frontend/data/training/finetuning_train.jsonl" \
        --val_file "frontend/data/training/finetuning_val.jsonl" \
        --output_dir "artifacts/ess_llama3.2_lora" \
        --epochs 3 \
        --batch_size 2 \
        --lr 2e-4
"""

import os
import sys
import argparse
import json

def parse_args():
    parser = argparse.ArgumentParser(description="ESS Chatbot SFT via QLoRA")
    parser.add_argument("--base_model", type=str, default="meta-llama/Llama-3.2-1B-Instruct",
                        help="Base Hugging Face model repository or local path")
    parser.add_argument("--train_file", type=str, default="data/training/ess-sales/train.jsonl",
                        help="Path to training JSONL")
    parser.add_argument("--val_file", type=str, default="data/training/ess-sales/validation.jsonl",
                        help="Path to validation JSONL")
    parser.add_argument("--output_dir", type=str, default="artifacts/ess_llama3.2_lora",
                        help="Destination directory for LoRA adapter checkpoints")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=2, help="Per-device train batch size")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--lora_rank", type=int, default=16, help="LoRA attention dimension (rank)")
    parser.add_argument("--lora_alpha", type=int, default=32, help="LoRA scaling parameter")
    parser.add_argument("--dry_run", action="store_true", help="Validate datasets and pipeline without GPU execution")
    return parser.parse_args()

def validate_dataset(filepath):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset file not found: {filepath}")
    valid_count = 0
    with open(filepath, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            line = line.trim() if hasattr(line, "trim") else line.strip()
            if not line:
                continue
            data = json.loads(line)
            if "messages" not in data or not isinstance(data["messages"], list):
                raise ValueError(f"Line {idx+1} in {filepath} missing 'messages' array.")
            for msg in data["messages"]:
                if "role" not in msg or "content" not in msg:
                    raise ValueError(f"Message in line {idx+1} missing role or content.")
            valid_count += 1
    return valid_count

def main():
    args = parse_args()

    print("===============================================================")
    print("🚀 ESS AI ASSISTANT — MODEL FINE-TUNING PIPELINE (QLoRA)")
    print("===============================================================")
    print(f"Base Model:       {args.base_model}")
    print(f"Train Dataset:    {args.train_file}")
    print(f"Val Dataset:      {args.val_file}")
    print(f"Output Directory: {args.output_dir}")
    print(f"LoRA Hyperparams: rank={args.lora_rank}, alpha={args.lora_alpha}, lr={args.lr}")
    print("---------------------------------------------------------------")

    # Step 1: Pre-flight Dataset Verification
    train_count = validate_dataset(args.train_file)
    val_count = validate_dataset(args.val_file)
    print(f"✅ Verified Train Samples:      {train_count}")
    print(f"✅ Verified Validation Samples: {val_count}")

    # Check CUDA Availability
    try:
        import torch
        has_cuda = torch.cuda.is_available()
        device_count = torch.cuda.device_count() if has_cuda else 0
        device_name = torch.cuda.get_device_name(0) if has_cuda else "None (CPU Only)"
    except ImportError:
        has_cuda = False
        device_count = 0
        device_name = "PyTorch not installed in active environment"

    print(f"🖥️ CUDA Available:              {has_cuda} (Devices: {device_count})")
    print(f"📟 GPU Hardware:                {device_name}")

    if args.dry_run or not has_cuda:
        print("---------------------------------------------------------------")
        print("⚠️ HARDWARE / RUNTIME ASSESSMENT:")
        if not has_cuda:
            print("   - QLoRA 4-bit training requires an NVIDIA GPU with CUDA drivers.")
            print("   - Current environment lacks CUDA acceleration.")
            print("   - To fine-tune this model, execute this script on a GPU-enabled instance")
            print("     (e.g., Google Colab with free T4 GPU, AWS g5.xlarge, or RunPod).")
            print(f"   - Dataset validation successfully PASSED ({train_count} train / {val_count} val).")
        else:
            print("   - Dry-run validation PASSED. Ready for GPU training.")
        print("===============================================================")
        return 0

    # Step 2: GPU Training Workflow (only executed when CUDA is available)
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        TrainingArguments,
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from trl import SFTTrainer
    from datasets import load_dataset

    print("🔧 Configuring 4-Bit BitsAndBytes Quantization (NF4)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    print(f"📥 Loading Tokenizer & Base Model: {args.base_model}...")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
    )
    model = prepare_model_for_kbit_training(model)

    print("🎯 Initializing LoRA Config...")
    peft_config = LoraConfig(
        r=args.lora_rank,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    print("📊 Loading SFT Datasets...")
    dataset = load_dataset("json", data_files={"train": args.train_file, "validation": args.val_file})

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        num_train_epochs=args.epochs,
        logging_steps=5,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        fp16=False,
        bf16=True,
        optim="paged_adamw_8bit",
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        args=training_args,
    )

    print("🏋️ Starting Training Loop...")
    trainer.train()

    print(f"💾 Saving LoRA Adapter Checkpoint to {args.output_dir}...")
    trainer.model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    print("🎉 Training Complete!")
    print(f"To merge and convert to GGUF for Ollama, run: bash scripts/export_to_ollama.sh {args.output_dir}")
    print("===============================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
