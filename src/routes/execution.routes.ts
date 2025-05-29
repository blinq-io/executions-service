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

const router = Router();

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
