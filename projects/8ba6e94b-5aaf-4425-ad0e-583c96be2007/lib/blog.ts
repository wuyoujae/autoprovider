import { query, execute, transaction } from './db';
import { buildPaginationQuery, PaginatedResult, PaginationParams } from './db-utils';
import { BlogPost, Category, CreateBlogPostInput, UpdateBlogPostInput } from '../types/blog';

export async function getAllPosts(params: PaginationParams): Promise<PaginatedResult<BlogPost>> {
  const baseQuery = 'SELECT * FROM blog_posts ORDER BY created_at DESC';
  const { query: paginatedQuery, countQuery } = buildPaginationQuery(baseQuery, params);
  
  const [posts, countResult] = await Promise.all([
    query<BlogPost[]>(paginatedQuery),
    query<{ total: number }[]>(countQuery)
  ]);
  
  const total = countResult[0]?.total || 0;
  const totalPages = Math.ceil(total / params.pageSize);
  
  return {
    items: posts,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages
  };
}

export async function getPostById(id: number): Promise<BlogPost | null> {
  const posts = await query<BlogPost[]>('SELECT * FROM blog_posts WHERE id = ?', [id]);
  if (!posts || posts.length === 0) return null;
  
  const post = posts[0];
  const categories = await getPostCategories(post.id);
  
  return { ...post, categories };
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await query<BlogPost[]>('SELECT * FROM blog_posts WHERE slug = ?', [slug]);
  if (!posts || posts.length === 0) return null;
  
  const post = posts[0];
  const categories = await getPostCategories(post.id);
  
  return { ...post, categories };
}

export async function createPost(input: CreateBlogPostInput): Promise<number> {
  const { categoryIds, ...postData } = input;
  
  return transaction(async (connection) => {
    const [result] = await connection.execute(
      'INSERT INTO blog_posts (title, slug, content, excerpt, featured_image, published, author_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        postData.title,
        postData.slug,
        postData.content,
        postData.excerpt || null,
        postData.featuredImage || null,
        postData.published !== undefined ? postData.published : false,
        postData.authorName || 'Admin'
      ]
    );
    
    const postId = result.insertId;
    
    if (categoryIds && categoryIds.length > 0) {
      const values = categoryIds.map(categoryId => 
        `(${postId}, ${categoryId})`
      ).join(', ');
      
      await connection.execute(
        `INSERT INTO post_categories (post_id, category_id) VALUES ${values}`
      );
    }
    
    return postId;
  });
}

export async function updatePost(input: UpdateBlogPostInput): Promise<boolean> {
  const { id, categoryIds, ...updateData } = input;
  
  return transaction(async (connection) => {
    // Only update fields that are provided
    const updates = Object.entries(updateData)
      .filter(([_, value]) => value !== undefined)
      .map(([key, _]) => `${snakeCaseKey(key)} = ?`);
    
    const values = Object.entries(updateData)
      .filter(([_, value]) => value !== undefined)
      .map(([_, value]) => value);
    
    if (updates.length > 0) {
      await connection.execute(
        `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`,
        [...values, id]
      );
    }
    
    if (categoryIds !== undefined) {
      // Delete existing relationships
      await connection.execute(
        'DELETE FROM post_categories WHERE post_id = ?',
        [id]
      );
      
      // Add new relationships if any
      if (categoryIds.length > 0) {
        const values = categoryIds.map(categoryId => 
          `(${id}, ${categoryId})`
        ).join(', ');
        
        await connection.execute(
          `INSERT INTO post_categories (post_id, category_id) VALUES ${values}`
        );
      }
    }
    
    return true;
  });
}

export async function deletePost(id: number): Promise<boolean> {
  const result = await execute('DELETE FROM blog_posts WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function incrementPostView(id: number): Promise<void> {
  await execute('UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?', [id]);
}

export async function getAllCategories(): Promise<Category[]> {
  return query<Category[]>('SELECT * FROM categories ORDER BY name');
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const categories = await query<Category[]>('SELECT * FROM categories WHERE id = ?', [id]);
  return categories.length > 0 ? categories[0] : null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await query<Category[]>('SELECT * FROM categories WHERE slug = ?', [slug]);
  return categories.length > 0 ? categories[0] : null;
}

export async function createCategory(category: Omit<Category, 'id'>): Promise<number> {
  const result = await execute(
    'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
    [category.name, category.slug, category.description || null]
  );
  return result.insertId;
}

export async function updateCategory(category: Category): Promise<boolean> {
  const result = await execute(
    'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?',
    [category.name, category.slug, category.description || null, category.id]
  );
  return result.affectedRows > 0;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const result = await execute('DELETE FROM categories WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getPostCategories(postId: number): Promise<Category[]> {
  return query<Category[]>(
    `SELECT c.* FROM categories c 
    JOIN post_categories pc ON c.id = pc.category_id 
    WHERE pc.post_id = ?`,
    [postId]
  );
}

// Helper function to convert camelCase to snake_case for database column names
function snakeCaseKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}
