"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleExecutionViaCronjob = scheduleExecutionViaCronjob;
const KubernetesClient_1 = require("../classes/KubernetesClient");
const scheduling_1 = require("../utils/scheduling");
async function scheduleExecutionViaCronjob(environmentVariables) {
    const k8s = new KubernetesClient_1.KubernetesClient();
    const manifest = (0, scheduling_1.generateCronJobYaml)(environmentVariables);
    console.log(`📃📃📃📃 Scheduling CronJob with manifest:`, manifest);
    await k8s.applyManifestFromYaml(manifest);
    console.log(`🕒 Scheduled CronJob for execution`, JSON.stringify(environmentVariables, null, 2));
}
