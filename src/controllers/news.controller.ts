import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import NewsArticle from '../models/news.model';

export const newsController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const articles = await NewsArticle.find().sort({ publishedAt: -1 });
      
      // Map to frontend expectations if necessary
      const mappedArticles = articles.map(art => ({
        id: art._id,
        title: art.title,
        content: art.content || '',
        summary: (art.content || '').substring(0, 100) + '...',
        tag: art.category,
        icon: '📰', // Default icon
        imageUrl: art.imageUrl,
        readingTimeMinutes: Math.ceil((art.content || '').split(' ').length / 200),
        publishedAt: art.publishedAt
      }));

      return res.json(responseFactory.success(mappedArticles, 'News articles fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const article = await NewsArticle.findById(id);
      if (!article) {
        return res.status(404).json(responseFactory.notFound('Article not found'));
      }
      return res.json(responseFactory.success(article, 'Article fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
