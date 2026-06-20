#!/bin/bash
set -e

FILES="analysis.js index.html"
TO="../../../../jgrogan_utils/projects/london_marathon_histograms/gemini-ai/plotly/"
FROM="../docs"


for f in ${FILES};
do
  echo "Copying $f"
  echo "  from $FROM"
  echo "  to $TO"
  cp "${FROM}/${f}" $TO
done

