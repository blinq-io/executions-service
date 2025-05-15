import { CronJobEnvVariables } from "../models/execution.model";

export function generateCronJobYaml(envVariables: CronJobEnvVariables): string {
  const {
    EXECUTION_ID,
    CRON_EXPRESSION,
    EXTRACT_DIR,
    BLINQ_TOKEN,
    NODE_ENV_BLINQ,
    HEADLESS,
  } = envVariables;

  return `
apiVersion: batch/v1
kind: CronJob
metadata:
  name: exec-${EXECUTION_ID}
spec:
  schedule: "${CRON_EXPRESSION}"
  suspend: false
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: curl-run-execution
            image: curlimages/curl:latest
            args:
            - /bin/sh
            - -c
            - |
              curl -X POST http://host.docker.internal:5000/api/executions/run/${EXECUTION_ID} \\
                -H "Content-Type: application/json" \\
                -d "{\\"BLINQ_TOKEN\\": \\"${BLINQ_TOKEN}\\", \\"EXTRACT_DIR\\": \\"${EXTRACT_DIR}\\", \\"HEADLESS\\": \\"${HEADLESS}\\", \\"NODE_ENV_BLINQ\\": \\"${NODE_ENV_BLINQ}\\"}"
          restartPolicy: OnFailure
`;
}


export function generateDynamicCronExpression(): string {
  const currentDate = new Date();

  // Apply +5:30 offset (in milliseconds)
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(currentDate.getTime() - istOffsetMs);
  let minutes = istDate.getMinutes();
  let hours = istDate.getHours();

  minutes += 1;

  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }

  if (hours === 24) {
    hours = 0;
  }

  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedHours = hours.toString().padStart(2, '0');

  return `${formattedMinutes} ${formattedHours} * * *`;
}