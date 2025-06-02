## 1. Get the basic flow working
### Frontend: Click run execution
### Backend: Spawn the pods, run the scenario successfully (generate the report links) ✅ Done

## 1.5 Unable to open browser inside the docker due to headless reasons -> ✅ Done

## 2. Run a flow with more than one sg -> Here -> ✅ done
### -> Current active sg function logic -> ✅ done

## 3. Generate Reports in a organized structure -> ✅ done
### -> Concurrency issues while writing?

## 3.5 Deployment -> ⭕ Doing
    - after deployment
    - handle graceful pod cleanup for workers
    - implement single threaded executions

## 4. Global Test Data

## 5. How to recover if the server crashes ⭐⭐⭐⭐⭐ NEXT BIG CHALLENGE
    - Restore running execution states
        - task queues for each flow
        - resume execution from that point on
    - How to append to the Report ❗❗❗
        - need a new route in cucumber js to interact with the Runs collection in Mongo DB
        - either Append to the original run id
        - or Create a new run id and migrate the reports of finish scenarios and delete the original

## Improvement Tasks, after basic functionality
    - Look into messaging queues
    - actively probe potential problems in the current implementation
    - Implement better monitoring and visibilty of the cluster

## Final tasks, non essential ones
    - Since we are using web sockets between main-app and executions-service maybe we can convert the CRUD routes to use sockets?? should we?
    - 

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



15 may
1. implement shutdown - ✅ done
2. Implement halting flow execution if sg fails - ✅ done
3. Implement descheduling - ✅ done