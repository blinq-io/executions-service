1. Deploy the backend server
    - build and push the new server image to docker registry
    - name: executions-service
    - CRUD routes are on port 5002
    - Socket routes are on port 5003
    - configure the deployment.yaml file
    - run: `kubectl apply -f deployments/executions-service-deployment.yaml`
2. Connect the frontend to the backend server - ✅ Done
3. Update the worker image to use the correct backend target urls - 
4. Implement cleanup for workers & have better failure handling
4. 

