"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubernetesClient = void 0;
// src/classes/KubernetesClient.ts
const k8s = __importStar(require("@kubernetes/client-node"));
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const logger_1 = __importDefault(require("../utils/logger"));
class KubernetesClient {
    constructor() {
        this.namespace = 'default';
        this.kc = new k8s.KubeConfig();
        this.kc.loadFromDefault();
        this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
    }
    async createPodFromYaml(yamlContent) {
        const manifest = yaml.load(yamlContent);
        if (!manifest || !manifest.metadata?.name) {
            throw new Error('❌ Invalid pod manifest.');
        }
        try {
            await this.k8sApi.createNamespacedPod({
                namespace: 'default',
                body: manifest
            });
            console.log(`⭐ Created pod ${manifest.metadata.name}`);
        }
        catch (err) {
            logger_1.default.error('❌ Failed to create pod:', err.body || err.message);
            throw err;
        }
    }
    async getPodStatus(name) {
        try {
            const res = await this.k8sApi.readNamespacedPodStatus({
                name,
                namespace: this.namespace
            });
            return res.status ? res.status.phase : null; // Return pod phase if exists, null otherwise
        }
        catch (err) {
            const reason = this.extractReason(err);
            if (reason === 'NotFound') {
                return null;
            }
            throw err; // Rethrow error if it's something else
        }
    }
    async applyManifestFromFile(filePath, vars) {
        let content = fs.readFileSync(filePath, 'utf-8');
        for (const [key, value] of Object.entries(vars)) {
            content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value); // ${KEY}
            content = content.replace(new RegExp(`<${key}>`, 'g'), value); // <KEY>
        }
        const obj = k8s.loadYaml(content);
        if (!obj.kind) {
            throw new Error('Manifest is missing `kind` field.');
        }
        console.log(`🔍 Applying manifest for ${obj.kind}...`);
        switch (obj.kind) {
            case 'PersistentVolumeClaim':
                try {
                    return await this.k8sApi.createNamespacedPersistentVolumeClaim({
                        namespace: this.namespace,
                        body: obj
                    });
                }
                catch (err) {
                    const reason = this.extractReason(err);
                    if (reason === 'AlreadyExists') {
                        console.log(`⚠️ PVC ${obj.metadata?.name} already exists, skipping creation.`);
                        return;
                    }
                    throw err;
                }
            case 'Pod':
                try {
                    return await this.k8sApi.createNamespacedPod({
                        namespace: this.namespace,
                        body: obj
                    });
                }
                catch (err) {
                    const reason = this.extractReason(err);
                    if (reason === 'AlreadyExists') {
                        console.log(`⚠️ Pod ${obj.metadata?.name} already exists, skipping creation.`);
                        return;
                    }
                    throw err;
                }
            default:
                throw new Error(`Unsupported kind: ${obj.kind}`);
        }
    }
    async applyManifestFromYaml(yamlString) {
        const documents = yaml.loadAll(yamlString);
        for (const doc of documents) {
            if (!this.isKubernetesResource(doc))
                continue;
            const kind = doc.kind;
            const metadata = doc.metadata || {};
            const namespace = metadata.namespace || 'default';
            switch (kind) {
                case 'CronJob':
                    try {
                        await this.batchApi.createNamespacedCronJob({
                            namespace,
                            body: doc,
                        });
                    }
                    catch (err) {
                        const reason = this.extractReason(err);
                        if (reason === 'AlreadyExists') {
                            console.log(`⚠️ PVC Cronjob already exists, skipping creation.`);
                            return;
                        }
                        throw err;
                    }
                    break;
                default:
                    throw new Error(`Unsupported kind in YAML: ${kind}`);
            }
        }
    }
    async deletePod(name) {
        await this.k8sApi.deleteNamespacedPod({
            name,
            namespace: this.namespace
        });
    }
    async deletePVC(name) {
        await this.k8sApi.deleteNamespacedPersistentVolumeClaim({
            name,
            namespace: this.namespace
        });
    }
    async waitForPodCompletion(podName, timeoutMs = 120000) {
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
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        throw new Error(`⏰ Timeout waiting for setup pod ${podName}`);
    }
    isKubernetesResource(doc) {
        return typeof doc === 'object' && doc !== null && typeof doc.kind === 'string';
    }
    extractReason(err) {
        try {
            const body = typeof err.body === 'string' ? JSON.parse(err.body) : err.body;
            return body?.reason || '';
        }
        catch {
            return '';
        }
    }
}
exports.KubernetesClient = KubernetesClient;
