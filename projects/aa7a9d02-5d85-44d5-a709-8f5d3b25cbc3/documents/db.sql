
-- SQL Operation @ 2026-01-06T21:03:08.686Z
USE myapp_7f73fe25_f7a9_4ab4_bc3e_3c4e6b61d2c8;

CREATE TABLE IF NOT EXISTS blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content LONGTEXT,
    cover_image VARCHAR(500),
    author VARCHAR(100) DEFAULT 'Admin',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    views INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS blog_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slug (slug)
);

CREATE TABLE IF NOT EXISTS blog_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_email VARCHAR(255),
    content TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_status (status)
);

-- SQL Operation @ 2026-01-06T21:03:32.982Z
USE myapp_7f73fe25_f7a9_4ab4_bc3e_3c4e6b61d2c8;

INSERT INTO blog_categories (name, slug, description, color) VALUES
('技术教程', 'tech-tutorials', '分享编程技巧和开发经验', '#3B82F6'),
('产品设计', 'product-design', '探讨产品设计和用户体验', '#10B981'),
('生活随笔', 'life-notes', '记录生活感悟和随想', '#F59E0B'),
('读书笔记', 'book-notes', '分享读书心得和书评', '#8B5CF6');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, author, status, views, is_featured, category, tags) VALUES
('Next.js 14 完全指南：从入门到精通', 'nextjs-14-complete-guide', '学习如何使用Next.js 14构建现代Web应用，包括App Router、Server Components等核心特性。', '<h2>引言</h2><p>Next.js 14是React生态系统中最强大的全栈框架之一。本指南将带你从入门到精通。</p><h2>主要特性</h2><p>1. App Router - 新的路由系统<br>2. Server Components - 服务端组件<br>3. Server Actions - 服务端操作<br>4. Streaming - 流式渲染</p><h2>总结</h2><p>Next.js 14为现代Web开发提供了强大的支持。', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800', 'Admin', 'published', 1250, TRUE, '技术教程', '["Next.js", "React", "Web开发"]'),
('用户体验设计的五大原则', 'ux-design-principles', '探索用户体验设计的核心原则，帮助你创建更好的产品。', '<h2>用户为中心</h2><p>所有设计决策都应该基于用户需求和期望。</p><h2>一致性</h2><p>保持界面和交互的一致性，让用户感到熟悉和舒适。</p><h2>反馈</h2><p>为用户的每个操作提供清晰的反馈。</p><h2>简洁</h2><p>去除不必要的复杂性，让用户专注于核心任务。</p><h2>可访问性</h2><p>确保产品对所有用户都是可用的。</p>', 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800', 'Admin', 'published', 890, TRUE, '产品设计', '["UX设计", "用户体验", "产品"]'),
('TypeScript 5.0 新特性详解', 'typescript-5-new-features', 'TypeScript 5.0带来了许多令人兴奋的新特性，让我们一起来探索。', '<h2>装饰器</h2><p>装饰器现在是ECMAScript标准的一部分，TypeScript 5.0对其提供了完整的支持。</p><h2>泛型参数默认值</h2><p>现在可以为泛型参数指定默认值。</p><h2>性能优化</h2><p>编译速度提升30%，内存使用减少50%。</p>', 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800', 'Admin', 'published', 650, FALSE, '技术教程', '["TypeScript", "编程语言"]'),
('如何打造个人品牌', 'build-personal-brand', '在数字时代，个人品牌越来越重要。这篇文章分享我的经验。', '<h2>为什么个人品牌重要</h2><p>个人品牌可以帮助你在职场中获得更多机会。</p><h2>如何开始</h2><p>1. 确定你的专业领域<br>2. 创建优质内容<br>3. 建立在线 presence<br>4. 与社区互动</p>', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', 'Admin', 'published', 720, FALSE, '生活随笔', '["个人品牌", "职业发展"]'),
('高效能人士的七个习惯读书笔记', 'seven-habits-notes', '分享《高效能人士的七个习惯》这本书的核心观点和个人感悟。', '<h2>主动积极</h2><p>对自己的人生负责，成为自己生活的主人。</p><h2>以终为始</h2><p>明确人生目标，然后朝着目标努力。</p><h2>要事第一</h2><p>优先处理最重要的事情。</p><h2>双赢思维</h2><p>寻求互利的解决方案。</p>', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', 'Admin', 'published', 980, TRUE, '读书笔记', '["读书笔记", "个人成长"]'),
('React Server Components 详解', 'react-server-components', '深入理解React Server Components的工作原理和使用场景。', '<h2>什么是Server Components</h2><p>Server Components是运行在服务端的React组件，它们可以访问数据库和文件系统。</p><h2>优势</h2><p>1. 减少客户端JavaScript<br>2. 直接访问后端资源<br>3. 更好的SEO</p>', 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800', 'Admin', 'published', 450, FALSE, '技术教程', '["React", "Server Components"]');
