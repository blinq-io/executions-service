import dotenv from 'dotenv';
dotenv.config(); 
const ClusterType = 'docker' // or minikube
export const THREAD_LIMIT = 4;
export const BACKEND_SOCKET_URL = process.env.BACKEND_SOCKET_URL || `ws://host.${ClusterType}.internal:5000`;
// export const BACKEND_SOCKET_URL = process.env.SOCKET_URL || 'ws://192.168.49.2:5000';
export const BACKEND_API_URL = process.env.API_URL || 'http://localhost:5000';
export const K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'default';

export const CONFIG_PATH = 'src/config_files';
export const PVC_YAML_PATH = CONFIG_PATH + '/pvc.yaml';
export const WORKER_YAML_PATH = CONFIG_PATH + '/workerPod.yaml';
export const SETUP_YAML_PATH = CONFIG_PATH + '/setupEnv.yaml';

export const TEST_CRON_EXPRESSION = '55 12 * * *';


// Signals
export const FINISHED_SG_SIGNAL = -1;
export const FINISHED_FLOW_SIGNAL = -2;
export const FINISHED_EXECUTION_SIGNAL = -3;

export const MAX_ATTEMPTS_PER_TASK = 1;