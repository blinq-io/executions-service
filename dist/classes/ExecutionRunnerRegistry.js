"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionRunnerRegistry = void 0;
class ExecutionRunnerRegistry {
    constructor() {
        this.runners = new Map();
    }
    set(executionId, runner) {
        this.runners.set(executionId, runner);
    }
    get(executionId) {
        return this.runners.get(executionId);
    }
    remove(executionId) {
        this.runners.delete(executionId);
    }
    has(executionId) {
        return this.runners.has(executionId);
    }
}
exports.executionRunnerRegistry = new ExecutionRunnerRegistry();
