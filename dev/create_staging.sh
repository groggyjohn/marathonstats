#!/bin/bash
set -e
mkdir -p ../staging
cp apply_staging.sh ../staging
cp ./start_marathonstats_server.sh  ../staging

cd ../staging
cp ../docs/analysis.js .
cp ../docs/index.html .
cp ../docs/data.js .



