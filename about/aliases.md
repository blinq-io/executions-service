gp - get pods
gl $1 - get logs
dp $1 - describe pod
gpvc - get pvc
delpod $1 - delete pod
delpvc $1 delete pvc


Temporary:
alias delworkers='kubectl get pods --no-headers -o custom-columns=":metadata.name" | grep 'worker-681e11c6f92a259ef51da7f0' | xargs kubectl delete pod'

docker build -t execution-controller:adi1 .; minikube image load execution-controller:adi1;