import fs from 'fs';
import path from 'path';

interface WorkerYamlOptions {
  EXECUTION_ID: string;
  EXTRACT_DIR: string;
  POD_ID: string;
  // FLOW_GROUP_KEY: string;
  BLINQ_TOKEN: string;
  SOCKET_URL: string;
}

export function generateWorkerYaml(options: WorkerYamlOptions): string {
  const templatePath = path.join(__dirname, 'workerPod.yaml');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const filled = template
    .replace(/{{EXECUTION_ID}}/g, options.EXECUTION_ID)
    .replace(/{{EXTRACT_DIR}}/g, options.EXTRACT_DIR)
    .replace(/{{POD_ID}}/g, options.POD_ID)
    // .replace(/{{FLOW_GROUP_KEY}}/g, options.FLOW_GROUP_KEY)
    .replace(/{{BLINQ_TOKEN}}/g, options.BLINQ_TOKEN)
    .replace(/{{SOCKET_URL}}/g, options.SOCKET_URL);
  return filled;
}
