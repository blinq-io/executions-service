product structure heirarchy:
 - topmost level entity: User
 - 1 User can create multiple Projects, each project is isolated from any other project, a project is stored on github in the form of a repo, the project repo contains the dependencies (node modules) and the code files (.feature and step_definitions files which contain user defined tests)
 - Within one project they can define automation tests in the form of Features for example: Login Page flows
 - Each Feature can have multiple scenarios, example: User login with email
 - Each scenario has a sequence of steps which are run to simulate the automation test
And for running an individual scenario we have a command which when executed in the terminal opens a chromium window and a terminal window where the steps are executed sequentially in the browser and the results are shown in the terminal window
To run scenarios locally we need to first perform a setup, this is the setup for setting up the local environment:
1
npm init -y
2
npm install @dev-blinq/cucumber-js@stage
3
npx cross-env NODE_ENV_BLINQ=stage node ./node_modules/@dev-blinq/cucumber-js/bin/download-install.js --token a0469f2c6d0dbc5814c90a6cd78fc090 --extractDir 67dd17e1aa7202aa104ad11b
4
cd 67dd17e1aa7202aa104ad11b
5
npm init -y
6
npm install @dev-blinq/cucumber_client@stage
7
npx playwright install

we run the above mentioned 7 commands in the console, what this does is clones a local version of the project repository and allows us to run scenarios locally
Now when i say i have to run a scenario, i mean i want to execute a custom command which runs the steps in the scenario, this is an example of the command:
const cmd = `npx cross-env NODE_ENV_BLINQ=stage BLINQ_ENV="environments/${env}.json" TOKEN=${process.env.TOKEN1} cucumber-js --format bvt --name "buy item" "features/shop.feature"`;
now since an execution contains a bunch of scenarios to be run (as scenario is the smallest quantity of work) and to run any scenario we need to setup the project repo, and since the execution and scenarios all come under a project, so we only need to setup the project repo once and all the pods can read and write to that shared volume. That's why when the k8s allocates pods i also want to initialize a shared read write access volume which contains the project repo and all the containers can use that and each pod will recieve a task from the backend, we can send the command in the task object and the pod can run and wait for the command to execute, so for each scenario this is all the work the task will contain

also when a scenario is executed using the above mentioned command, a new folder is created inside the project repo for example runs/10 if this is the 10th run overall since the project was initialized and data generated during the run is written inside the folder

also one last clarification the exec.env variable that you see is nothing but a https URL, this URL is opened in the chromium window and inside this website the scenario steps are executed, dont confuse this env with the environment setup which is the 7 steps above to setup the project repo and the dependencies