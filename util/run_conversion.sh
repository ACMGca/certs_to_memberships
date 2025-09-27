#!/bin/bash

# export PUBLISH=true
unset PUBLISH

# clear old artifacts
rm ./public/data/*.xlsx
rm ./public/data/*.zip
rm -rf ./public/data/ACMG_Member_Files

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