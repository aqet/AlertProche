// Post model
export type PostType = 'Disparition' | 'Abus' | 'Prevention' | 'Appel à l\'aide';

export interface Post {
  _id: string;
  author_id: string;
  authorPseudo?: string;
  isAnonymous?: boolean;
  title: string;
  content: string;
  location: string;
  type: PostType;
  image_url?: string;
  isActive?: boolean;
  createdAt: string;
  commentCount?: number;
  reportReasons?: any
}

export interface CreatePostDto {
  title: string;
  content: string;
  location: string;
  type: PostType;
  isAnonymous?: boolean;
}
