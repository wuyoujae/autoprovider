<think>
用户要我将代码片段合并到原始文件中。代码片段修改了 `getPostById` 和 `getPostBySlug` 两个函数，将返回值改为 `(rows as PostWithCategory[])[0]` 这样的类型断言形式。

我需要：
1. 找到原始文件中的 `getPostById` 函数
2. 找到原始文件中的 `getPostBySlug` 函数
3. 用代码片段中的实现替换它们

让我仔细比较：

原始文件的 `getPostById`:
```typescript
export async function getPostById(id: number) {
  const pool = await getConnection();
  const [rows] = await pool.query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug 
     FROM posts p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.id = ?`,
    [id]
  );
  return rows[0];
}
```

代码片段的 `getPostById`:
```typescript
export async function getPostById(id: number) {
  const pool = await getConnection();
  const [rows] = await pool.query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug 
     FROM posts p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.id = ?`,
    [id]
  );
  return (rows as PostWithCategory[])[0];


}
```

接下来我将比较 `getPostBySlug` 函数的修改。这两个函数的变更模式类似，都需要添加类型断言。我将直接应用类似的替换策略，确保函数返回正确类型的单个帖子对象。

我注意到函数现在需要处理可能的未定义情况，并确保返回的帖子对象符合 `PostWithCategory` 接口要求。通过添加 `(rows as PostWithCategory[])[0]`，我可以确保类型安全和正确的数据结构返回。

我将验证类型断言的有效性，并确保函数在查询结果为空时能够正确处理未定义情况。这种方法提供了更强的类型保证和更清晰的代码意图。

修改后的实现需要保持原有函数签名，同时提高类型安全性。我将仔细检查 `getPostById` 和 `getPostBySlug` 的实现，确保它们符合 TypeScript 的严格类型检查要求。

对于函数返回类型，我需要考虑在未找到帖子时返回 `undefined`，这意味着返回类型应该使用联合类型 `PostWithCategory | undefined`。这样可以更准确地反映可能的查询结果，并在调用处提供更好的类型推断。

我将修改 `getPostById` 和 `getPostBySlug` 的返回类型，确保类型安全和准确性。对于 `getPosts` 函数，我会保持原有的实现，不做不必要的修改。
</think>

import { getConnection } from './db';
import { Post, Category } from './db';

interface PostWithCategory extends Post {
  category_name?: string;
  category_slug?: string;
}

export async function getPosts(options?: { categoryId?: number; status?: string; limit?: number; offset?: number }) {
  const pool = await getConnection();
  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM posts p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: (number | string)[] = [];
  
  if (options?.categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(options.categoryId);
  }
  if (options?.status) {
    sql += ' AND p.status = ?';
    params.push(options.status);
  } else {
    sql += ' AND p.status = "published"';
  }
  
  sql += ' ORDER BY p.created_at DESC';
  
  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  if (options?.offset) {
    sql += ' OFFSET ?';
    params.push(options.offset);
  }
  
  const [rows] = await pool.query(sql, params);
  return rows as PostWithCategory[];
}

export async function getPostById(id: number) {
  const pool = await getConnection();
  const [rows] = await pool.query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug 
     FROM posts p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.id = ?`,
    [id]
  );
  return (rows as PostWithCategory[])[0];
}

export async function getPostBySlug(slug: string) {
  const pool = await getConnection();
  const [rows] = await pool.query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug 
     FROM posts p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.slug = ?`,
    [slug]
  );
  return (rows as PostWithCategory[])[0];
}

export async function createPost(data: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  category_id?: number;
  status?: string;
}) {
  const pool = await getConnection();
  const [result] = await pool.query(
    `INSERT INTO posts (title, slug, content, excerpt, cover_image, category_id, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.slug, data.content, data.excerpt || null, data.cover_image || null, data.category_id || null, data.status || 'draft']
  );
  return result;
}

export async function updatePost(id: number, data: Partial<{
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string;
  category_id: number;
  status: string;
}>) {
  const pool = await getConnection();
  const fields: string[] = [];
  const values: (string | number | undefined)[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  values.push(id);
  const [result] = await pool.query(
    `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result;
}

export async function deletePost(id: number) {
  const pool = await getConnection();
  const [result] = await pool.query('DELETE FROM posts WHERE id = ?', [id]);
  return result;
}

export async function incrementViewCount(id: number) {
  const pool = await getConnection();
  await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id]);
}

export async function getPostCount(options?: { categoryId?: number; status?: string }) {
  const pool = await getConnection();
  let sql = 'SELECT COUNT(*) as count FROM posts WHERE 1=1';
  const params: (number | string)[] = [];
  
  if (options?.categoryId) {
    sql += ' AND category_id = ?';
    params.push(options.categoryId);
  }
  if (options?.status) {
    sql += ' AND status = ?';
    params.push(options.status);
  }
  
  const [rows] = await pool.query(sql, params);
  return rows[0].count;
}

export async function searchPosts(keyword: string) {
  const pool = await getConnection();
  const [rows] = await pool.query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug 
     FROM posts p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.status = "published" 
     AND (p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
  );
  return rows;
}