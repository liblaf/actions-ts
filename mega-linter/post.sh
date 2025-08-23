#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

echo "Missing linter files:"
cat "$RUNNER_TEMP/missing-linter-files.list"

while read -r filename; do
  rm --force --verbose "$filename"
done < "$RUNNER_TEMP/missing-linter-files.list"
