import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { PatternLibrary } from '../patterns/PatternLibrary';
import { NotificationRequest, PatternWithMetadata } from '../types';
import logger from '../utils/logger';

export function createRoutes(notificationService: NotificationService, patternLibrary: PatternLibrary): Router {
  const router = Router();

  router.post('/api/notify', async (req: Request, res: Response) => {
    try {
      const request: NotificationRequest = req.body;
      
      if (!request.pattern_id) {
        return res.status(400).json({ 
          status: 'error', 
          error: 'pattern_id is required' 
        });
      }

      const response = await notificationService.handleNotification(request);
      res.json(response);
    } catch (error) {
      logger.error('Notification error:', error);
      res.status(500).json({ 
        status: 'error', 
        error: 'internal_server_error' 
      });
    }
  });

  router.get('/api/patterns', (req: Request, res: Response) => {
    try {
      const patterns = patternLibrary.getAllPatterns();
      res.json(patterns);
    } catch (error) {
      logger.error('Get patterns error:', error);
      res.status(500).json({ error: 'internal_server_error' });
    }
  });

  router.get('/api/patterns/:id', (req: Request, res: Response) => {
    try {
      const pattern = patternLibrary.getPattern(req.params.id);
      
      if (!pattern) {
        return res.status(404).json({ error: 'pattern_not_found' });
      }
      
      res.json(pattern);
    } catch (error) {
      logger.error('Get pattern error:', error);
      res.status(500).json({ error: 'internal_server_error' });
    }
  });

  router.post('/api/patterns', (req: Request, res: Response) => {
    try {
      const pattern: PatternWithMetadata = req.body;
      
      if (!pattern.id || !pattern.animation) {
        return res.status(400).json({ 
          error: 'pattern must have id and animation' 
        });
      }

      if (patternLibrary.getPattern(pattern.id)) {
        return res.status(409).json({ 
          error: 'pattern_already_exists' 
        });
      }

      pattern.metadata.created_at = new Date().toISOString();
      pattern.metadata.usage_count = 0;
      
      patternLibrary.addPattern(pattern);
      res.status(201).json({ id: pattern.id });
    } catch (error) {
      logger.error('Create pattern error:', error);
      res.status(500).json({ error: 'internal_server_error' });
    }
  });

  router.put('/api/patterns/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const pattern: PatternWithMetadata = req.body;
      
      if (!pattern.id || !pattern.animation) {
        return res.status(400).json({ 
          error: 'pattern must have id and animation' 
        });
      }

      if (pattern.id !== id) {
        return res.status(400).json({ 
          error: 'pattern id mismatch' 
        });
      }

      const success = patternLibrary.updatePattern(id, pattern);
      
      if (!success) {
        return res.status(404).json({ error: 'pattern_not_found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Update pattern error:', error);
      res.status(500).json({ error: 'internal_server_error' });
    }
  });

  router.delete('/api/patterns/:id', (req: Request, res: Response) => {
    try {
      const success = patternLibrary.deletePattern(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: 'pattern_not_found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Delete pattern error:', error);
      res.status(500).json({ error: 'internal_server_error' });
    }
  });

  router.get('/api/patterns/search', (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: 'query parameter q is required' });
      }

      const tags = query.toLowerCase().split(/\s+/);
      const patterns = patternLibrary.searchPatterns(tags);
      
      res.json(patterns);
    } catch (error) {
      logger.error('Search patterns error:', error);
      res.status(500).json({ error: 'internal_server_error' });
    }
  });

  router.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'led-notification-service',
      version: '1.0.0'
    });
  });

  return router;
}