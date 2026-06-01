// Comment model
export interface Comment {
  _id: string;
  post_id: string;
  author_id: string;
  authorPseudo?: string;
  isAnonymous?: boolean;
  content: string;
  createdAt: string;
}

export interface CreateCommentDto {
  content: string;
  isAnonymous?: boolean;
}
