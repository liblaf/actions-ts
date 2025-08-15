#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

while read -r filename; do
  if [[ -z $filename ]]; then continue; fi
  rm --force --verbose "$filename"
done < "$RUNNER_TEMP/missing-linter-files.list"
