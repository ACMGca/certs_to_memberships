#!/bin/bash

# clear old artifacts
rm ./public/data/*.xlsx

bun util/parseAll.js

