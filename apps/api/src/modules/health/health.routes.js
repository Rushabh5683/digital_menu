import { Router } from 'express';
import { getHealth } from './health.service.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res, next) => {
  try {
    const health = await getHealth();
    res.json(health);
  } catch (error) {
    next(error);
  }
});
