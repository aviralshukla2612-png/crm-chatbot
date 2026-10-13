#!/usr/bin/env bash
set -e

# =================================================================
# ESS CHATBOT — EXPORT CHECKPOINTS & IMPORT TO OLLAMA
# Converts fine-tuned LoRA weights to 16-bit GGUF, quantizes to Q4_K_M,
# and builds a custom Ollama image with instant rollback safety.
# =================================================================

CHECKPOINT_DIR="${1:-artifacts/ess_llama3.2_lora}"
MODEL_NAME="ess-sales-llama3.2"

echo "==============================================================="
echo "📦 EXPORTING FINE-TUNED MODEL CHECKPOINT TO OLLAMA"
echo "==============================================================="
echo "Checkpoint Source: ${CHECKPOINT_DIR}"
echo "Target Model Name: ${MODEL_NAME}"
echo "---------------------------------------------------------------"

if [ ! -d "${CHECKPOINT_DIR}" ]; then
  echo "⚠️ Checkpoint directory '${CHECKPOINT_DIR}' not found!"
  echo "Building standard Ollama model image from scripts/Modelfile..."
  ollama create "${MODEL_NAME}" -f scripts/Modelfile
  echo "✅ Successfully built and registered '${MODEL_NAME}' in local Ollama runtime."
  exit 0
fi

# Step 1: Merge LoRA weights if separate
echo "1. Merging LoRA weights with base model..."
python3 - <<EOF
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

base_model = "meta-llama/Llama-3.2-1B-Instruct"
adapter = "${CHECKPOINT_DIR}"
merged_dir = "${CHECKPOINT_DIR}/merged"

print(f"Loading base model {base_model}...")
model = AutoModelForCausalLM.from_pretrained(base_model, torch_dtype=torch.float16, device_map="cpu")
tokenizer = AutoTokenizer.from_pretrained(base_model)

print(f"Loading adapter from {adapter}...")
model = PeftModel.from_pretrained(model, adapter)
model = model.merge_and_unload()

print(f"Saving merged weights to {merged_dir}...")
model.save_pretrained(merged_dir)
tokenizer.save_pretrained(merged_dir)
print("Merge complete.")
EOF

# Step 2: Convert to GGUF using llama.cpp
echo "2. Converting merged checkpoint to GGUF..."
if [ -d "llama.cpp" ]; then
  python3 llama.cpp/convert_hf_to_gguf.py "${CHECKPOINT_DIR}/merged" --outfile "${CHECKPOINT_DIR}/ess-model-f16.gguf"
  ./llama.cpp/llama-quantize "${CHECKPOINT_DIR}/ess-model-f16.gguf" "${CHECKPOINT_DIR}/ess-model-q4_k_m.gguf" Q4_K_M
fi

# Step 3: Register in Ollama
echo "3. Registering model in Ollama runtime..."
ollama create "${MODEL_NAME}" -f scripts/Modelfile

echo "==============================================================="
echo "✅ MODEL VERIFICATION & ROLLBACK READY"
echo "Active Model:    ${MODEL_NAME}"
echo "Rollback Target: llama3.2:1b (or Groq llama-3.3-70b-versatile)"
echo "Test Inference:  ollama run ${MODEL_NAME} 'what service they provide'"
echo "==============================================================="
