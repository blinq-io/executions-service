import { Router, Request, Response, NextFunction } from 'express';

import {
    createExecution,
    deleteExecution,
    getAllExecutions,
    getExecutionById,
    getFreeThreadCount,
    runExecution,
    updateExecution,
    deleteFlow
} from '../controllers/executionController';
import { clearStreamHook, setStreamHook } from '../utils/sse';

const router = Router();

//? SSE attempt, not working yet, TODO later
// router.get('/stream', (req, res) => {
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders();

//     setStreamHook(res);

//     const keepAlive = setInterval(() => {
//         res.write(': keep-alive\n\n');
//     }, 1000);

//     req.on('close', () => {
//         clearInterval(keepAlive);
//         clearStreamHook();
//         console.log('🔌 SSE client disconnected');
//     });
// });

router.get('/', getAllExecutions);
router.post('/new', createExecution);
router.post('/run/:id', runExecution);
router.get('/free-thread-count', getFreeThreadCount);
router.get('/:id', getExecutionById);
router.put('/:id', updateExecution);
router.delete('/:id', deleteExecution);
router.delete('/:id/flows/:flowIndex', deleteFlow);

export default router;
