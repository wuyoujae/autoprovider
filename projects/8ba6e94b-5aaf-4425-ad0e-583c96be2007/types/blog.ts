export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
  viewCount: number;
  categories?: Category[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  published?: boolean;
  authorName?: string;
  categoryIds?: number[];
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {
  id: number;
}
