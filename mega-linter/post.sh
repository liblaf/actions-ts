#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

LINTER_RULES_PATH='tmp.6NE8UxMvCk/linters'

while read -r filename; do
  if [[ -z $filename ]]; then continue; fi
  rm --force --verbose "$filename"
done < "$LINTER_RULES_PATH/missing-files.list"
