export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  is_featured: boolean;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  created_at: string;
}

export interface BlogComment {
  id: number;
  post_id: number;
  author_name: string;
  author_email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface CreatePostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  category: string;
  tags: string[];
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: number;
}

export interface CreateCommentInput {
  post_id: number;
  author_name: string;
  author_email: string;
  content: string;
}

export interface PostsResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
}
