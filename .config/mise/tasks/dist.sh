#!/bin/bash
#MISE depends=["build"]
set -o errexit
set -o nounset
set -o pipefail

ACTIONS=(approve)
DIST_DIR='dist'

mkdir --parents --verbose "$DIST_DIR"
cp --archive --recursive --verbose \
  --target-directory="$DIST_DIR" "${ACTIONS[@]}"
