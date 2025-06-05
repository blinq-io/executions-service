import { BACKEND_SOCKET_URL } from "../constants";
import { CronJobEnvVariables, Schedule } from "../models/execution.model";

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
  name: exec-cronjob-${EXECUTION_ID}
spec:
  schedule: "${CRON_EXPRESSION}"
  suspend: false
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 60
      template:
        spec:
          containers:
          - name: curl-run-execution
            image: curlimages/curl:latest
            args:
            - /bin/sh
            - -c
            - |
              curl -X POST ${BACKEND_SOCKET_URL}/api/executions/run/${EXECUTION_ID} \\
                -H "Content-Type: application/json" \\
                -d "{\\"BLINQ_TOKEN\\": \\"${BLINQ_TOKEN}\\", \\"EXTRACT_DIR\\": \\"${EXTRACT_DIR}\\", \\"VIA_CRON\\": \\"true\\", \\"HEADLESS\\": \\"${HEADLESS}\\", \\"NODE_ENV_BLINQ\\": \\"${NODE_ENV_BLINQ}\\"}"
          restartPolicy: OnFailure
`;
}

//? * * * * * - Cron expression format
//  | | | | +----- Day of the week (0 - 7) (Sunday=0 or 7)
//  | | | +------- Month (1 - 12) //! not relevant for our scheduling
//  | | +--------- Day of the month (1 - 31)  //! not relevant for our scheduling
//  | +----------- Hour (0 - 23)
//  +------------- Minute (0 - 5
export function generateDynamicCronExpression(schedule: Schedule): string {
  const [h, m] = schedule.time.split(':').map(Number);

  const t = new Date(Date.UTC(2025, 4, 16, h, m, 0));
  const positiveOffset = schedule.timeZone > 0;
  const offsetH = Math.floor(Math.abs(schedule.timeZone));
  const offsetM = Math.round((Math.abs(schedule.timeZone) - offsetH) * 60);

  if (!positiveOffset) {
    t.setUTCHours(t.getUTCHours() + offsetH);
    t.setUTCMinutes(t.getUTCMinutes() + offsetM);
  } else {
    t.setUTCHours(t.getUTCHours() - offsetH);
    t.setUTCMinutes(t.getUTCMinutes() - offsetM);
  }

  let minutes = t.getUTCMinutes();
  let hours = t.getUTCHours();

  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedHours = hours.toString().padStart(2, '0');

  const dayMap: Record<string, string> = {
    Sun: "0",
    Mon: "1",
    Tue: "2",
    Wed: "3",
    Thu: "4",
    Fri: "5",
    Sat: "6",
  };

  const dayPart = schedule.days.length > 0
    ? schedule.days.map((d) => dayMap[d]).join(",")
    : "*";

  const cron = `${formattedMinutes} ${formattedHours} * * ${dayPart}`;

  console.log("📆 Cron will run at UTC time:", `${hours}:${minutes} UTC`);
  console.log("📆 Local time input:", schedule.time, "Timezone offset:", schedule.timeZone);
  console.log("📆 Selected days:", schedule.days.join(", "));
  console.log("🕒 Final Cron expression:", cron);

  return cron;
}
