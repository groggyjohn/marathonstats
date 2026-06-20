#!/bin/bash
set -e

FILE="data.js"
FROM="../../../../jgrogan_utils/projects/london_marathon_histograms/gemini-ai/plotly/"
TO="../docs"

echo "Copying $FILE"
echo "  from $FROM"
echo "  to $TO"
cp ${FROM}/${FILE} $TO

