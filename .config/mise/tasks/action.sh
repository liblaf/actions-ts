#!/bin/bash
#MISE depends=["build"]
set -o errexit
set -o nounset
set -o pipefail

action="$1"
cd "dist/$action/"

dotenv='.env'
if [[ ! -f $dotenv ]]; then
  echo > "$dotenv"
fi
local-action run '.' 'dist/main.js' "$dotenv"
