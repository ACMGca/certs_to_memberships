#!/bin/bash

# clear old artifacts
rm ./public/data/*.xlsx

bun util/parseAll.js

sleep 3

if [ "$PUBLISH" = "true" ]; then

  echo "Publishing..."
  git add ./public/data/conversion.json
  git commit -m "auto data republish"
  git push
  
else
  echo "Skipping publish, PUBLISH is not set to true."
fi