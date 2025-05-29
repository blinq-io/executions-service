"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCronJobYaml = generateCronJobYaml;
exports.generateDynamicCronExpression = generateDynamicCronExpression;
function generateCronJobYaml(envVariables) {
    const { EXECUTION_ID, CRON_EXPRESSION, EXTRACT_DIR, BLINQ_TOKEN, NODE_ENV_BLINQ, HEADLESS, } = envVariables;
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
function generateDynamicCronExpression(schedule) {
    const [h, m] = schedule.time.split(':').map(Number);
    const t = new Date(Date.UTC(2025, 4, 16, h, m, 0));
    const positiveOffset = schedule.timeZone > 0;
    const offsetH = Math.floor(Math.abs(schedule.timeZone));
    const offsetM = Math.round((Math.abs(schedule.timeZone) - offsetH) * 60);
    if (!positiveOffset) {
        t.setUTCHours(t.getUTCHours() + offsetH);
        t.setUTCMinutes(t.getUTCMinutes() + offsetM);
    }
    else {
        t.setUTCHours(t.getUTCHours() - offsetH);
        t.setUTCMinutes(t.getUTCMinutes() - offsetM);
    }
    let minutes = t.getUTCMinutes();
    let hours = t.getUTCHours();
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedHours = hours.toString().padStart(2, '0');
    return `${formattedMinutes} ${formattedHours} * * *`;
}
