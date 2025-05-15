For reference:
gp - get pods
gl $1 - get logs
dp $1 - describe pod
gpvc - get pvc
delpod $1 - delete pod
delpvc $1 delete pvc


# Temporary:

First set these:

export EXECUTION_ID=681f5cec9074438ede56819f
export IMAGE_TAG=jqic81

Then use the aliases below:

## Delete all pods that match worker-$EXECUTION_ID
alias del_workers="kubectl get pods --no-headers -o custom-columns=':metadata.name' | grep worker-$EXECUTION_ID | xargs kubectl delete pod"

## Inspect setup pod
alias is="gl setup-$EXECUTION_ID"

## Reset command to delete pvc and worker pod resources
alias reset='delpod "worker-$EXECUTION_ID"; delpvc "pvc-$EXECUTION_ID"'


## Get pods and PVCs
alias gs='gp; gpvc'

## Build and load image with dynamic tag
alias bl="docker build -t execution-controller:asdf231 . && minikube image load execution-controller:asdf231"

## Enter the first worker of the first pod container by full pod name
alias enter_first="kubectl exec -it worker-$EXECUTION_ID.flow0.sg0.w0 -- bash"

## More flexible enter function with any pod name
enter_pod() {
  kubectl exec -it "$1" -- bash
}

kubectl cp ./env2.sh worker-681f5cec9074438ede56819f.flow0.sg0.w0:/app/environment-setup.sh


## Trigger cron job manually:
kubectl create job --from=cronjob/exec-6824974c57dcbb2349d25366 manual-trigger-job

kubectl create job --from=cronjob/exec-6824804f1f29cb1558a4d3be manual-trigger-job