export const THREAD_LIMIT = 10;
export const BACKEND_SOCKET_URL = process.env.SOCKET_URL || 'ws://host.minikube.internal:5000';
// export const BACKEND_SOCKET_URL = process.env.SOCKET_URL || 'ws://192.168.49.2:5000';
export const BACKEND_API_URL = process.env.API_URL || 'http://localhost:5000';
export const K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'default';