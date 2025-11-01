#!/bin/bash

# Script to check for deleted code in git history related to empty responses
# Based on spec: ./specs/spec.md

echo "🔍 Checking for deleted code related to empty responses in git history..."
echo "=================================================================="

# Keywords to search for
KEYWORDS=("empty response" "no response" "response generated" "assistant message" "content.*empty" "fallback" "retry" "error.*response" "trim" "whitespace" "content.trim" "strip")

echo ""
echo "1. Searching for commits that removed code with response-related keywords..."
echo "-----------------------------------------------------------------------"

for keyword in "${KEYWORDS[@]}"; do
    echo ""
    echo "Searching for keyword: '$keyword'"
    echo "Commits where this keyword was removed:"
    git log -p -S"$keyword" --diff-filter=D | grep -A 5 -B 5 "^-.*$keyword" | head -20
done

echo ""
echo "2. Searching for deleted files that might contain response handling..."
echo "---------------------------------------------------------------------"

git log --diff-filter=D --summary | grep "delete mode" | head -10

echo ""
echo "3. Searching commit messages for response-related issues..."
echo "-----------------------------------------------------------"

git log --grep="response\|empty\|fallback" --oneline | head -10

echo ""
echo "4. Detailed search for 'No response generated' string changes..."
echo "------------------------------------------------------------------"

git log -p -S"No response generated" | head -50

echo ""
echo "5. Check for recent changes to response handling in src/index.ts..."
echo "---------------------------------------------------------------------"

git log --oneline -10 src/index.ts

echo ""
echo "=================================================================="
echo "Report generation complete. Review the output above for potential"
echo "deleted code that handled empty responses."