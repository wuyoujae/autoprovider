<think>
用户要求修复 db.ts 中的未使用变量问题。

让我分析问题：
1. 原始文件中有一个 `const pool: Pool | null = null;`
2. 但是在 `getConnection` 函数内部又使用了 `const pool = createPool(...)`，这会创建一个新的局部变量，而不是使用外部的全局变量
3. 这导致外部的 `pool` 变量永远是 `null`，并且内部的 `pool` 变量遮蔽了外部的 `pool`

修复方案：
1. 将 `const pool` 改为 `let pool` 以便后续可以赋值
2. 导入 `createPool` 
3. 在 `getConnection` 函数内部，将 `const pool` 改为 `pool = `，这样才能给全局变量赋值

用户提供的代码片段：
```
import { createPool, Pool } from 'mysql2/promise';

let pool: Pool | null = null;

export async function getConnection() {
  if (pool) return pool;
  
  pool = createPool({
```

我需要将这些更改应用到原始文件中。

让我看看需要替换的部分：

原始文件第一行：
`import { Pool } from 'mysql2/promise';`

应该替换为：
`import { createPool, Pool } from 'mysql2/promise';`

原始文件第二行：
`const pool: Pool | null = null;`

应该替换为：
`let pool: Pool | null = null;`

在 getConnection 函数中，原来的代码：


```typescript
  const pool = createPool({
```

需要改为：
```typescript
  pool = createPool({
```

我将逐步更新文件内容，确保变量声明和导入语句正确修改。关键是将 `const` 改为 `let`，并确保正确引入 `createPool` 函数。这样可以避免局部变量遮蔽全局变量的问题，同时保持代码的逻辑不变。
</think>

import { createPool, Pool } from 'mysql2/promise';

let pool: Pool | null = null;

export async function getConnection() {
  if (pool) return pool;
  
  pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'c8d45af7_1818_40b4_b72f_72a65cd7f0c7',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  
  return pool;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  category_id: number | null;
  status: 'draft' | 'published' | 'archived';
  view_count: number;
  created_at: Date;
  updated_at: Date;
  category?: Category;
}

export interface Tag {
  id: number;
  name: string;
  created_at: Date;
}