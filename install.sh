#!/bin/bash
set -e

# Install project dependencies
npm install

# Ensure React type definitions are installed
npm install --save-dev @types/react @types/react-dom
