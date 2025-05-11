gp - get pods
gl $1 - get logs
dp $1 - describe pod
gpvc - get pvc
delpod $1 - delete pod
delpvc $1 delete pvc


# Temporary:
alias delworkers='kubectl get pods --no-headers -o custom-columns=":metadata.name" | grep 'worker-681f5cec9074438ede56819f' | xargs kubectl delete pod'

alias delworker='delpod worker-681f5cec9074438ede56819f.flow0.sg0.w0'
alias is='gl setup-681f5cec9074438ede56819f'

alias reset='delpod worker-681f5cec9074438ede56819f.flow0.sg0.w0; delpvc pvc-681f5cec9074438ede56819f'
alias gs='gp;gpvc'

# Build and load image
docker build -t execution-controller:jqic81 .; minikube image load execution-controller:jqic81;

❯ alias bl='docker build -t execution-controller:jqic81 .; minikube image load execution-controller:jqic81;'

# SSH into a running container
❯ kubectl exec -it worker-681f5cec9074438ede56819f.flow0.sg0.w0 -- bash

alias enter='kubectl exec -it worker-681f5cec9074438ede56819f.flow0.sg0.w0 -- bash'

alias logs='gl worker-681f5cec9074438ede56819f.flow0.sg0.w0'

kubectl cp ./env2.sh worker-681f5cec9074438ede56819f.flow0.sg0.w0:/app/environment-setup.sh
