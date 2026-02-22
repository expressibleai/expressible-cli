#!/bin/bash
# Expressible Distill demo script
# Usage: asciinema rec --command "./demo/run-demo.sh" demo.cast

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
SPEED=0.03
SHORT_PAUSE=0.4
MED_PAUSE=0.8

CYAN='\033[0;36m'
NC='\033[0m'

type_cmd() {
  local cmd="$1"
  printf "${CYAN}\$ ${NC}"
  for (( i=0; i<${#cmd}; i++ )); do
    printf "%s" "${cmd:$i:1}"
    sleep "$SPEED"
  done
  echo ""
  sleep 0.2
}

# Type the prefix, print the rest instantly
type_prefix_then_print() {
  local prefix="$1"
  local rest="$2"
  printf "${CYAN}\$ ${NC}"
  for (( i=0; i<${#prefix}; i++ )); do
    printf "%s" "${prefix:$i:1}"
    sleep "$SPEED"
  done
  printf "%s" "$rest"
  echo ""
  sleep 0.2
}

# Clean up any previous demo run
rm -rf /tmp/clause-detector

echo ""
echo "  Expressible Distill — train a local ML classifier in under a minute"
echo ""
sleep 1

# Step 1: Init (show clean name, actually create in /tmp)
type_cmd "expressible distill init clause-detector"
echo "" | expressible distill init /tmp/clause-detector 2>&1 | sed 's|/tmp/||g'
sleep "$SHORT_PAUSE"

type_cmd "cd clause-detector"
cd /tmp/clause-detector
sleep "$SHORT_PAUSE"

# Step 2: Add training data
cp "$DEMO_DIR/labeled-clauses.json" /tmp/clause-detector/
type_cmd "expressible distill add --file labeled-clauses.json"
expressible distill add --file labeled-clauses.json
sleep "$SHORT_PAUSE"

# Step 3: Train
type_cmd "expressible distill train"
expressible distill train 2>&1 | sed 's|/tmp/||g'
sleep "$MED_PAUSE"

# Step 4: Run inference — type the command, print the clause instantly
type_prefix_then_print \
  'expressible distill run "' \
  'The Vendor shall indemnify and hold harmless the Client from all claims, damages, and expenses arising from breach of this Agreement"'
expressible distill run "The Vendor shall indemnify and hold harmless the Client from all claims, damages, and expenses arising from breach of this Agreement"
sleep "$MED_PAUSE"

type_prefix_then_print \
  'expressible distill run "' \
  'Either party may terminate this Agreement at any time for any reason by providing 90 days written notice"'
expressible distill run "Either party may terminate this Agreement at any time for any reason by providing 90 days written notice"
sleep "$MED_PAUSE"

echo ""
echo "  No cloud. No API keys. Everything ran locally."
echo ""
sleep 1.5
