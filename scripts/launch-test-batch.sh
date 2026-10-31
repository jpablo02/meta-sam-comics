#!/usr/bin/env bash
# Launch a batch of test comics on the cloud worker, all at once: varied ideas
# chosen to fail if anything is going to, and several comics running together,
# as when several judges create at the same time.
#
#   bash scripts/launch-test-batch.sh
#
# Each comic shows in the feed as "Tales test", with an id starting "batch-".
set -euo pipefail

PROJECT=token-comic-498321
REGION=us-east4
STAMP=$(date +%s | tail -c 6)

ideas=(
  "An astronaut alone on Mars finds a black box from a mission that was never launched. The gem: the black box."
  "A mischievous dog steals grandpa's old brass key and runs through the whole village with it."
  "Dos hermanas pelean por la herencia de su madre."
  "Three friends chase a motorcycle thief through the night market of Bogota."
  "A tired detective receives a blackmail letter that names the mayor."
)

for i in "${!ideas[@]}"; do
  id="batch-${STAMP}-$((i + 1))"
  job=$(printf '{"id":"%s","author":{"id":"tales-test","name":"Tales test"},"createdAt":"%s","idea":%s}' \
    "$id" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(printf '%s' "${ideas[$i]}" | node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8")))')")
  b64=$(printf '%s' "$job" | base64 | tr -d '\n')
  gcloud run jobs execute tales-worker --project "$PROJECT" --region "$REGION" \
    --update-env-vars "TALES_JOB=$b64" --async --quiet 2>&1 | grep -i "execution\|error" | head -1
  echo "launched $id"
done
