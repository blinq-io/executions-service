delete ❯ kubectl delete pod $POD_NAME
get logs ❯ kubectl logs $POD_NAME
get pods ❯ kubectl get pods
apply manifest file ❯ kubectl apply -f src/jobs/testing/setupEnv.yaml
docker build ❯ docker build -t execution-controller:dev .

To debug a pod like this:
backend on  main [✘!?] via 🐳 tcp://127.0.0.1:50937 is 📦 v1.0.0 via  v22.14.0 on ☁️  (eu-north-1) took 24s 
❯ kubectl get pods
NAME                             READY   STATUS   RESTARTS   AGE
setup-6819b2976e53a8e793d1ab3e   0/1     Error    0          13s

❯ kubectl describe pod setup-6819b2976e53a8e793d1ab3e
observe details like start time, end time, exit code

we did this:
kubectl apply -f src/jobs/pvc.yaml
kubectl apply -f src/jobs/setupEnv.yaml

continuous logs ❯ kubectl logs -f setup-6819b2976e53a8e793d1ab3e