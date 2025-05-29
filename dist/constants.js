"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ATTEMPTS_PER_TASK = exports.FINISHED_EXECUTION_SIGNAL = exports.FINISHED_FLOW_SIGNAL = exports.FINISHED_SG_SIGNAL = exports.TEST_CRON_EXPRESSION = exports.SETUP_YAML_PATH = exports.WORKER_YAML_PATH = exports.PVC_YAML_PATH = exports.CONFIG_PATH = exports.K8S_NAMESPACE = exports.BACKEND_API_URL = exports.BACKEND_SOCKET_URL = exports.THREAD_LIMIT = void 0;
const ClusterType = 'docker'; // or minikube
exports.THREAD_LIMIT = 10;
exports.BACKEND_SOCKET_URL = process.env.SOCKET_URL || `ws://host.${ClusterType}.internal:5000`;
// export const BACKEND_SOCKET_URL = process.env.SOCKET_URL || 'ws://192.168.49.2:5000';
exports.BACKEND_API_URL = process.env.API_URL || 'http://localhost:5000';
exports.K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'default';
exports.CONFIG_PATH = 'src/config_files';
exports.PVC_YAML_PATH = exports.CONFIG_PATH + '/pvc.yaml';
exports.WORKER_YAML_PATH = exports.CONFIG_PATH + '/workerPod.yaml';
exports.SETUP_YAML_PATH = exports.CONFIG_PATH + '/setupEnv.yaml';
exports.TEST_CRON_EXPRESSION = '55 12 * * *';
// Signals
exports.FINISHED_SG_SIGNAL = -1;
exports.FINISHED_FLOW_SIGNAL = -2;
exports.FINISHED_EXECUTION_SIGNAL = -3;
exports.MAX_ATTEMPTS_PER_TASK = 1;
