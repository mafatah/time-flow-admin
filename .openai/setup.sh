#!/bin/bash
# Install dependencies before the network is disabled
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
