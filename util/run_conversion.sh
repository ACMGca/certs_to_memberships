#!/bin/bash

# clear old artifacts
rm ./public/data/*

bun util/parseAll.js

