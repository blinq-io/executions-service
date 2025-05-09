gp - get pods
gl $1 - get logs
dp $1 - describe pod
gpvc - get pvc
delpod $1 - delete pod
delpvc $1 delete pvc


Temporary:
alias delworkers='kubectl get pods --no-headers -o custom-columns=":metadata.name" | grep 'worker-681def26d7b4790c227aca1b' | xargs kubectl delete pod'

docker build -t execution-controller:sd23 .; minikube image load execution-controller:sd23;