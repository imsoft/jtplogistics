export interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}
