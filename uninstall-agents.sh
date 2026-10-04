#!/usr/bin/env bash
set -euo pipefail

echo "==> Preparing to uninstall Spec-Test-Gate Engine..."
read -rp "Are you sure you want to remove .agents/ and the workflow configurations? (y/N): " confirm
case "$confirm" in
  [yY][eE][sS]|[yY]) ;;
  *)
    echo "Aborted."
    exit 0
    ;;
esac

# 1. پاک‌سازی دایرکتوری .agents
if [ -d .agents ]; then
  rm -rf .agents
  echo "==> [SUCCESS] Removed .agents/ directory."
fi

# 2. پاک‌سازی هوشمند از فایل‌های AGENTS.md
TARGET_AGENT_FILE=""
for f in AGENTS.md agents.md AGENT.md; do
  if [ -f "$f" ]; then
    TARGET_AGENT_FILE="$f"
    break
  fi
done

if [ -n "$TARGET_AGENT_FILE" ]; then
  # بررسی وجود نشانگر اختصاصی فلو
  if grep -q "SPEC-TEST-GATE ENGINE" "$TARGET_AGENT_FILE"; then
    # بررسی اینکه آیا فایل فقط حاوی همین ابزار بوده یا بخش‌های دیگری هم دارد
    NON_STG_LINES=$(grep -v "SPEC-TEST-GATE ENGINE" "$TARGET_AGENT_FILE" | grep -v "Spec-Test-Gate" | grep -v "^#" | grep -v "^$" | wc -l || true)
    
    if [ "$NON_STG_LINES" -le 5 ]; then
      # فایل صرفاً برای همین فلو تولید شده بود؛ حذف کامل فایل
      rm -f "$TARGET_AGENT_FILE"
      echo "==> [SUCCESS] Removed standalone $TARGET_AGENT_FILE."
    else
      # فایل از قبل قوانین اختصاصی دیگری داشته است؛ صرفاً بلاک مربوطه حذف می‌شود
      sed -i.bak '/# --- SPEC-TEST-GATE ENGINE (OPT-IN WORKFLOW) ---/,/# --- END SPEC-TEST-GATE ENGINE ---/d' "$TARGET_AGENT_FILE"
      rm -f "${TARGET_AGENT_FILE}.bak"
      echo "==> [SUCCESS] Cleaned Spec-Test-Gate block from $TARGET_AGENT_FILE without touching original instructions."
    fi
  fi
fi

# حذف اسکریپت‌های نصب در صورت تمایل (اختیاری)
if [ -f init-agents.sh ]; then
  read -rp "Do you also want to remove init-agents.sh and uninstall-agents.sh? (y/N): " rm_scripts
  case "$rm_scripts" in
    [yY][eE][sS]|[yY])
      rm -f init-agents.sh
      rm -f -- "$0"
      echo "==> [SUCCESS] Removed installer and uninstaller scripts."
      exit 0
      ;;
  esac
fi

echo "==> Uninstallation completed successfully."