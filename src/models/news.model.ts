import mongoose, { Schema, Document } from 'mongoose';

export interface INewsArticle extends Document {
  title: string;
  content: string;
  author: string;
  category: string;
  publishedAt: Date;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsArticleSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<INewsArticle>('NewsArticle', NewsArticleSchema);
