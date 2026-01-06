
-- SQL Operation @ 2026-01-06T20:42:18.422Z
USE c8d45af7_1818_40b4_b72f_72a65cd7f0c7;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image VARCHAR(500),
  category_id INT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT,
  tag_id INT,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

INSERT INTO categories (name, slug, description) VALUES
('技术分享', 'tech', '分享技术知识和经验'),
('生活随笔', 'life', '记录生活点滴'),
('读书笔记', 'reading', '读书心得和感悟'),
('项目管理', 'pm', '项目管理相关的思考');

INSERT INTO posts (title, slug, content, excerpt, category_id, status, view_count) VALUES
('欢迎来到我的博客', 'welcome-to-my-blog', '# 欢迎来到我的博客\n\n这是一个使用 Next.js、TypeScript 和 MySQL 构建的现代化博客网站。\n\n## 主要功能\n\n- 📝 文章管理 - 创建、编辑、发布文章\n- 🏷️ 分类管理 - 灵活的文章分类\n- 🔍 文章搜索 - 快速找到感兴趣的内容\n- 📱 响应式设计 - 完美支持各种设备\n\n## 技术栈\n\n- **前端**: Next.js 14 + TypeScript + Tailwind CSS\n- **UI组件**: shadcn/ui\n- **后端**: Next.js Server Actions\n- **数据库**: MySQL\n\n感谢您的访问！', '这是一个使用 Next.js 构建的现代化博客网站介绍', 1, 'published', 100),
('TypeScript 入门指南', 'typescript-getting-started', '# TypeScript 入门指南\n\nTypeScript 是 JavaScript 的超集，为 JS 添加了静态类型支持。\n\n## 为什么选择 TypeScript？\n\n1. **类型安全** - 编译时发现错误\n2. **更好的开发体验** - 智能代码补全\n3. **重构更容易** - 放心修改代码\n4. **文档化** - 类型即文档\n\n## 基础类型\n\n```typescript\n// 原始类型\nlet name: string = "Tom";\nlet age: number = 25;\nlet isStudent: boolean = true;\n\n// 数组\nlet numbers: number[] = [1, 2, 3];\nlet names: Array<string> = ["Tom", "Jerry"];\n\n// 对象类型\ninterface User {\n  name: string;\n  age: number;\n  email?: string;  // 可选属性\n}\n```', 'TypeScript 入门教程，帮助你快速掌握 TypeScript 的基础知识', 1, 'published', 250),
('如何保持高效工作', 'stay-productive', '# 如何保持高效工作\n\n在快节奏的生活中，保持高效工作是一个重要的技能。\n\n## 1. 制定清晰的计划\n\n每天开始工作前，花 10-15 分钟制定当日计划。\n\n## 2. 番茄工作法\n\n将工作时间分成 25 分钟的小块，每工作 25 分钟休息 5 分钟。\n\n## 3. 减少干扰\n\n- 关闭不必要的通知\n- 保持工作环境整洁\n- 设定专注时间段\n\n## 4. 定期回顾\n\n每周回顾自己的工作，总结经验教训。', '分享保持高效工作的方法和技巧', 2, 'published', 180);

-- SQL Operation @ 2026-01-06T20:42:29.238Z
USE c8d45af7_1818_40b4_b72f_72a65cd7f0c7;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  content LONGTEXT NOT NULL,
  excerpt TEXT,
  cover_image VARCHAR(500),
  category_id INT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT,
  tag_id INT,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- SQL Operation @ 2026-01-06T20:44:57.866Z
USE c8d45af7_1818_40b4_b72f_72a65cd7f0c7;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  content LONGTEXT NOT NULL,
  excerpt TEXT,
  cover_image VARCHAR(500),
  category_id INT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT,
  tag_id INT,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
