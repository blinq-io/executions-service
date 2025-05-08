// src/classes/KubernetesClient.ts
import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export class KubernetesClient {
  private k8sApi: k8s.CoreV1Api;
  private namespace = 'default';

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  async createPodFromYaml(yamlContent: string) {
    const manifest = yaml.load(yamlContent) as k8s.V1Pod;

    if (!manifest || !manifest.metadata?.name) {
      throw new Error('Invalid pod manifest.');
    }

    try {
      await this.k8sApi.createNamespacedPod({
        namespace: 'default', // The namespace of the pod
        body: manifest        // The manifest of the pod (k8s.V1Pod)
      });
      console.log(`🚀 Created pod ${manifest.metadata.name}`);
    } catch (err: any) {
      console.error('❌ Failed to create pod:', err.body || err.message);
      throw err;
    }
  }

  async applyManifestFromFile(filePath: string, vars: Record<string, string>) {
    let content = fs.readFileSync(filePath, 'utf-8');
    console.log('🪨 Content of', filePath, 'before:', JSON.stringify(content, null, 2));
    for (const [key, value] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value); // ${KEY}
      content = content.replace(new RegExp(`<${key}>`, 'g'), value);       // <KEY>
    }
    console.log('✨ Content of', filePath, 'after:', JSON.stringify(content, null, 2));

    const obj = k8s.loadYaml(content) as k8s.V1PersistentVolumeClaim | k8s.V1Pod;
    if (!obj.kind) {
      throw new Error('Manifest is missing `kind` field.');
    }

    switch (obj.kind) {
      case 'PersistentVolumeClaim':
        try {
          return await this.k8sApi.createNamespacedPersistentVolumeClaim({
            namespace: this.namespace,
            body: obj as k8s.V1PersistentVolumeClaim
          });
        } catch (err: any) {
          if (err?.body?.reason === 'AlreadyExists') {
            console.log(`⚠️ PVC ${obj.metadata?.name} already exists, skipping creation.`);
            return;
          }
          throw err; // rethrow if it's a different error
        }
      case 'Pod':
        return await this.k8sApi.createNamespacedPod({
          namespace: this.namespace,
          body: obj as k8s.V1Pod
        });
      default:
        throw new Error(`Unsupported kind: ${obj.kind}`);
    }
  }

  async deletePod(name: string) {
    await this.k8sApi.deleteNamespacedPod({
      name: name,              // The name of the pod to delete
      namespace: this.namespace // The namespace in which the pod exists
    });
  }

  async deletePVC(name: string) {
    await this.k8sApi.deleteNamespacedPersistentVolumeClaim({
      name: name,
      namespace: this.namespace
    });
  }

  async waitForPodCompletion(podName: string, timeoutMs = 60000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const res = await this.k8sApi.readNamespacedPodStatus({
        name: podName,
        namespace: this.namespace
      });

      const phase = res.status?.phase;
      console.log(`🔄 Pod ${podName} status: ${phase}`);

      if (phase === 'Succeeded') {
        console.log(`✅ Setup pod ${podName} completed successfully.`);
        return;
      }

      if (phase === 'Failed') {
        throw new Error(`❌ Setup pod ${podName} failed.`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
    }

    throw new Error(`⏰ Timeout waiting for setup pod ${podName}`);
  }

}
