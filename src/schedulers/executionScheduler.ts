import { KubernetesClient } from "../classes/KubernetesClient";
import { CronJobEnvVariables } from "../models/execution.model";
import { generateCronJobYaml } from "../utils/scheduling";

export async function scheduleExecutionViaCronjob(environmentVariables: CronJobEnvVariables) {
  const k8s = new KubernetesClient();

  const manifest = generateCronJobYaml(environmentVariables);

  await k8s.applyManifestFromYaml(manifest);
  console.log(`🕒 Scheduled CronJob for execution`, JSON.stringify(environmentVariables, null, 2));
}