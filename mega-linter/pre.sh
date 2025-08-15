#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

LINTER_RULES_PATH='tmp.6NE8UxMvCk/linters'

MISSING_FILES=()

find "$LINTER_RULES_PATH" -type f -print0 |
  while IFS= read -d '' -r file; do
    filename="$(basename -- "$file")"
    if [[ -f $filename ]]; then continue; fi
    cp --archive --no-target-directory --verbose "$file" "$filename"
    MISSING_FILES+=("$filename")
  done

printf '%s\n' "${MISSING_FILES[@]}" > "$RUNNER_TEMP/missing-linter-files.list"
