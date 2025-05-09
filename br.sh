#!/bin/bash

# Delete the existing pod (ignore error if not found)
kubectl delete pod setup-681def26d7b4790c227aca1b --ignore-not-found
kubectl delete pvc pvc-681def26d7b4790c227aca1b --ignore-not-found
kubectl wait --for=delete pod/setup-681def26d7b4790c227aca1b --timeout=30s || true

# Exit on error
set -e

# Use Minikube's Docker environment
# eval $(minikube docker-env)

# Build Docker image
docker build -t execution-controller:dev .

# Load image into Minikube
minikube image load execution-controller:dev

# Apply the PersistentVolumeClaim manifest
kubectl apply -f src/jobs/testing/pvc.yaml

BUILD_ID=$(date +%s)
sed "s|\${BUILD_ID}|$BUILD_ID|g" src/jobs/testing/setupEnv.yaml | kubectl apply -f -

# Show pod status
kubectl get pods

# ✅ All of this works as of now