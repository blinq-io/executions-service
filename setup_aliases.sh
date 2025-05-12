#!/bin/bash
# set -e  # Exit on errors (except those we handle manually)
# set -x  # Print each command before executing it (for debugging)

EXECUTION_ID=$1
IMAGE_TAG=$2

export EXECUTION_ID="$EXECUTION_ID"
export IMAGE_TAG="$IMAGE_TAG"