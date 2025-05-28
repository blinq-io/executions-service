import { Router, Request, Response, NextFunction } from 'express';

import {
    createExecution,
    deleteExecution,
    getAllExecutions,
    getExecutionById,
    getFreeThreadCount,
    runExecution,
    updateExecution,
    deleteFlow,
    scheduleExecution,
    descheduleExecution,
    haltExecution,
    getActiveExecutionsStatus,
    getReportLinkByIdOfActiveExecution
} from '../controllers/executionController';
import { addNewStreamListener, removeStreamListener } from '../utils/general';

const router = Router();

// ? SSE attempt, not working yet, TODO later
router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    addNewStreamListener(res, 'crud');

    const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 1000);

    req.on('close', () => {
        clearInterval(keepAlive);
        removeStreamListener(res, 'crud');
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

    addNewStreamListener(res, 'status');

    const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 1000);

    req.on('close', () => {
        clearInterval(keepAlive);
        removeStreamListener(res, 'status');
        console.log('🔌 SSE_status client disconnected');
    });
});

router.get('/', getAllExecutions);
router.post('/new', createExecution);
router.post('/run/:id', runExecution);
router.post('/schedule/:id', scheduleExecution);
router.post('/deschedule/:id', descheduleExecution);
router.post('/halt/:id', haltExecution);
router.get('/free-thread-count', getFreeThreadCount);
router.get('/report-link/:id', getReportLinkByIdOfActiveExecution);
router.get('/:id', getExecutionById);
router.put('/:id', updateExecution);
router.delete('/:id', deleteExecution);
router.delete('/:id/flows/:flowIndex', deleteFlow);


export default router;
