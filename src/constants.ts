export const THREAD_LIMIT = 10;
export const BACKEND_SOCKET_URL = process.env.SOCKET_URL || 'ws://host.minikube.internal:5000';
// export const BACKEND_SOCKET_URL = process.env.SOCKET_URL || 'ws://192.168.49.2:5000';
export const BACKEND_API_URL = process.env.API_URL || 'http://localhost:5000';
export const K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'default';

export const CONFIG_PATH = 'src/config_files';
export const PVC_YAML_PATH = CONFIG_PATH + '/pvc.yaml';
export const WORKER_YAML_PATH = CONFIG_PATH + '/workerPod.yaml';
export const SETUP_YAML_PATH = CONFIG_PATH + '/setupEnv.yaml';

export const TEST_CRON_EXPRESSION = '55 12 * * *';

