"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const executionController_1 = require("../controllers/executionController");
const general_1 = require("../utils/general");
const router = (0, express_1.Router)();
// ? SSE attempt, not working yet, TODO later
router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    (0, general_1.addNewStreamListener)(res, 'crud');
    const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 1000);
    req.on('close', () => {
        clearInterval(keepAlive);
        (0, general_1.removeStreamListener)(res, 'crud');
        console.log('🔌 SSE_crud client disconnected');
    });
});
router.get('/status/active', (req, res) => {
    const { projectId } = req.query;
    process.env.projectId = String(projectId);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    (0, general_1.addNewStreamListener)(res, 'status');
    const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 1000);
    req.on('close', () => {
        clearInterval(keepAlive);
        (0, general_1.removeStreamListener)(res, 'status');
        console.log('🔌 SSE_status client disconnected');
    });
});
router.get('/', executionController_1.getAllExecutions);
router.post('/new', executionController_1.createExecution);
router.post('/run/:id', executionController_1.runExecution);
router.post('/schedule/:id', executionController_1.scheduleExecution);
router.post('/deschedule/:id', executionController_1.descheduleExecution);
router.post('/halt/:id', executionController_1.haltExecution);
router.get('/free-thread-count', executionController_1.getFreeThreadCount);
router.get('/report-link/:id', executionController_1.getReportLinkByIdOfActiveExecution);
router.get('/:id', executionController_1.getExecutionById);
router.put('/:id', executionController_1.updateExecution);
router.delete('/:id', executionController_1.deleteExecution);
router.delete('/:id/flows/:flowIndex', executionController_1.deleteFlow);
exports.default = router;
