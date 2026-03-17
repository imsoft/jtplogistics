export type IdeaStatus = "pending" | "accepted" | "rejected";

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: IdeaStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}
