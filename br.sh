#!/bin/bash

# Delete the existing pod (ignore error if not found)
kubectl delete pod setup-681c9703caf20a72a22cbe49 || true
kubectl delete pvc pvc-681c9703caf20a72a22cbe49 || true

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
