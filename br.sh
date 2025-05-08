#!/bin/bash

# Delete the existing pod (ignore error if not found)
kubectl delete pod setup-681c9703caf20a72a22cbe49 --ignore-not-found
kubectl delete pvc pvc-681c9703caf20a72a22cbe49 --ignore-not-found
kubectl wait --for=delete pod/setup-681c9703caf20a72a22cbe49 --timeout=30s || true

# Exit on error
set -e

# Use Minikube's Docker environment
# eval $(minikube docker-env)

# Build Docker image
docker build -t execution-controller:dev2 .

# Load image into Minikube
minikube image load execution-controller:dev2

# Apply the PersistentVolumeClaim manifest
kubectl apply -f src/jobs/testing/pvc.yaml

BUILD_ID=$(date +%s)
sed "s|\${BUILD_ID}|$BUILD_ID|g" src/jobs/testing/setupEnv.yaml | kubectl apply -f -

# Show pod status
kubectl get pods
