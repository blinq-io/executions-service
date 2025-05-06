import { createExecution, getAllExecutions, getExecutionById, getFreeThreadCount, runExecution, updateExecution } from '../controllers/executionController';
import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

const logger = (req: Request, res: Response, next: NextFunction): void => {
    console.log(JSON.stringify({
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    }, null, 2));
    next();
}

router.get('/', getAllExecutions);
router.post('/new',  createExecution);
router.post('/run/:id',  runExecution);
router.get('/free-thread-count',  getFreeThreadCount);
router.get('/:id',  getExecutionById);
router.put('/:id',  updateExecution);

export default router;
