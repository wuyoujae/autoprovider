<think>
用户要求修复 category.ts 中的类型问题。让我分析一下原始文件和代码片段。

原始文件中的 `updateCategory` 函数：
```typescript
export async function updateCategory(id: number, data: { name?: string; slug?: string; description?: string }) {
  const pool = await getConnection();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (data.name) { fields.push('name = ?'); values.push(data.name); }
  if (data.slug) { fields.push('slug = ?'); values.push(data.slug); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  
  values.push(id);
  const [result] = await pool.query(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result;
}
```

代码片段将 `values: any[]` 改为 `values: (string | number)[]`

这是因为：
1. `values` 数组接收的是 `data.name` (string)、`data.slug` (string)、`data.description` (string | undefined)、以及 `id` (number)
2. 当 `data.description !== undefined` 时，`data.description` 应该是 string 类型
3. 所以最终 values 数组中的元素类型是 string 或 number

修改后的代码应该是：


我需要调整类型定义，确保正确反映 values 数组的实际类型。`id` 是 number，而其他字段可能是字符串。这种类型变化反映了数据更新的复杂性，需要精确地捕获可能的数据类型。
</think>

import { getConnection } from './db';

export async function getCategories() {
  const pool = await getConnection();
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
  return rows;
}

export async function getCategoryById(id: number) {
  const pool = await getConnection();
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0];
}

export async function getCategoryBySlug(slug: string) {
  const pool = await getConnection();
  const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
  return rows[0];
}

export async function createCategory(data: { name: string; slug: string; description?: string }) {
  const pool = await getConnection();
  const [result] = await pool.query(
    'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
    [data.name, data.slug, data.description || null]
  );
  return result;
}

export async function updateCategory(id: number, data: { name?: string; slug?: string; description?: string }) {
  const pool = await getConnection();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  
  if (data.name) { fields.push('name = ?'); values.push(data.name); }
  if (data.slug) { fields.push('slug = ?'); values.push(data.slug); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  
  values.push(id);
  const [result] = await pool.query(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result;
}

export async function deleteCategory(id: number) {
  const pool = await getConnection();
  const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  return result;
}