"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorkerYaml = generateWorkerYaml;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function generateWorkerYaml(options) {
    const templatePath = path_1.default.join(__dirname, 'workerPod.yaml');
    const template = fs_1.default.readFileSync(templatePath, 'utf-8');
    const filled = template
        .replace(/{{EXECUTION_ID}}/g, options.EXECUTION_ID)
        .replace(/{{EXTRACT_DIR}}/g, options.EXTRACT_DIR)
        .replace(/{{POD_ID}}/g, options.POD_ID)
        // .replace(/{{FLOW_GROUP_KEY}}/g, options.FLOW_GROUP_KEY)
        .replace(/{{BLINQ_TOKEN}}/g, options.BLINQ_TOKEN)
        .replace(/{{SOCKET_URL}}/g, options.SOCKET_URL);
    return filled;
}
