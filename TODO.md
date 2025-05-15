## 1. Get the basic flow working
### Frontend: Click run execution
### Backend: Spawn the pods, run the scenario successfully (generate the report links) ✅ Done

## 1.5 Unable to open browser inside the docker due to headless reasons -> ✅ Done

## 2. Run a flow with more than one sg -> Here
### -> Current active sg function logic

## 3. Generate Reports in a organized structure
### -> Concurrency issues while writing?

---------------------------------------------------------------------------------------------------------------------------------------------------------------------

1. Able to run an execution via an API, currently tested one execution with one flow > with one sg > containing one scenario > with one step - login to shop
2. Next steps:
    [▲] Test with more than one scenarios per scenario groups in more than one thread
    [▼] Improve monitoring of which pod is running which scenario via better logs
    [?] Scenario/Task fail retry mechanism, is it needed
    [⭐] How to generate reports systematically *** NEXT big task ***
        [->] Observe what is happening in the custom runs folder
        [->] Concurrency issues
            [->] RunsId generation and assignment
    [-] Executions UI
    [-] Schedule cron jobs
    [✅] Make a setup-aliases.sh script to make it easier to inspect
    [✅] Make executions on a project level
    [✅] Refine the backend
    [-] getActiveGroupIndex()
    [⭐] Execute a flow with 3 groups in proper order
        - prerequisite: Edit Execution page
            - Able to add new scenario groups
                - for now just add a plus button which opens the modal ...
    [UI] - Update execution schedule logic
    [❗] - Show user the progress of the execution
    [❗] - Improve visibility inside the pods to see how many and which pods, to track pods
4. Performance concerns:
5. [❗] - Discuss the data exhcange and the APIs with Guy
6. [❗] - Discuss the scalability and extensibilty of the code - using Message Queues in place of sockets


## For storing the results 
- use Kafka for preserving results
- not pvc, use s3

TODO: 14 May
1. Create a cluster, maintain it, ingress controller for the routes
2. Work on the code, test everything
3. Instead of yaml use helm charts
4. 
