U -> UI
B -> execution-service (backend)
K -> K8s
P -> Docker pods (agents)
1. U: user clicks run now for any execution
2. B: /executions/run/:id is triggered
3. B: runner = new ExecutionRunner(e, io) and runner.start
4. B: initialize queues - put scenarios into labeled queues with label: execId:flow0:sg0
5. B: runner.start() - spawnPods() and setupSocketServer()
6. B: spawnPods() - create new k8s client, create PVC pod by applying manifestFromFile pvc.yml, create setupEnv pod to initialize the pvc, wait for completion, delete setup pod, create worker pods for each scenario group of each flow
till point 6 we have written the code, but i want to make sure the code works, then we'll proceed to points 7 and more
7. now we need to make sure the pods are correctly connected via websockets to the backend service, then we can start sending tasks from the Backend server
8. so now the infrastructure has been setup, all the worker pods and the shared pvc has been initialized with the project repo and the necessary dependencies, before proceeding further i want to setup everything locally, so right now i have the frontend and the backend running locally, i also want to run all the pods and k8s locally and perform step 9
9. B: work on the setupSocketServer function  and agent.assignTask, i want to start with a basic command like 'date; ls -la;' to be sent to all the workerpods to check if they work or not after that i will write the functionality to construct the actual command to be sent


✅ Execution Flow Plan
INITIATION
U: User clicks “Run Now” for a test execution in the frontend.

B: POST /executions/run/:id is triggered.

B: Backend instantiates the runner:
const runner = new ExecutionRunner(execution, io);

B: runner.start() is called.

PREPARATION
B: Inside start():

initializeQueues() → pushes scenarios into task queues with labels like executionId:flow0:sg1.

spawnPods() → sets up environment and agents.

setupSocketServer() → starts listening for agent connections.

B → K: In spawnPods():

Create a PVC (shared volume) for the execution.

Launch setupEnv pod:

Mounts the PVC

Runs environment-setup.sh

Installs dependencies & extracts repo

Terminates on completion

Wait for setup pod to succeed

Delete setup pod

Spawn N worker pods (one per thread per group) with:

PVC mounted

AGENT_MODE=true

agent-entry.js as the entrypoint

✅ You are here: verifying step 6 locally
🔜 Next Steps
CONNECTIVITY + SOCKET HANDSHAKE
P → B: Each worker pod starts and connects via WebSocket to the backend:

Agent sends agent:ready with its pod ID & flowGroupKey

Backend stores this agent in a pool (e.g. agentPool.set(flowGroupKey, agent))

TASK ASSIGNMENT
B → P: Backend sends a test task (e.g. 'date; ls -la') using agent.assignTask(command)

P: Worker pod runs the command and sends back logs via socket

B: Backend handles logs, saves them or displays them in the frontend

🧹 CLEANUP
B: Once all tasks are complete:

Gracefully close agent sockets

Delete worker pods

Optionally delete the PVC


# Running br.sh
