#!/bin/sh
# Capture the fixed progress views (src/regions/slavonia/views.js) of the current build into the
# timelapse: docs/slavonia/progress/<view>/<UTC date_time>_<label>.jpg, and log the step in
# docs/slavonia/progress/README.md. Run it after every build step and commit the result.
#   tools/progress/shoot.sh "short label of the step"
set -e
cd "$( dirname "$0" )/../.."
label=${1:?usage: tools/progress/shoot.sh "label"}
stamp=$( date -u +%Y-%m-%d_%H%M )
tmp=$( mktemp -d )
node test/world-slavonia.mjs "$tmp" --small 2>&1 | grep -v '^Warning' || true
python3 tools/progress/collect.py "$tmp" "$stamp" "$label"
rm -rf "$tmp"
