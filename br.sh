#!/bin/bash

# Delete the existing pod (ignore error if not found)
kubectl delete pod setup-6819b2976e53a8e793d1ab3e || true
kubectl delete pvc pvc-6819b2976e53a8e793d1ab3e || true

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

# Apply the pod manifest
kubectl apply -f src/jobs/testing/setupEnv.yaml

# Show pod status
kubectl get pods
