# 文件上传解析功能 - 快速开始

## 🚀 启动服务

### 1. 启动 Python 文件解析服务

```bash
cd backend/autoprovider/utils/fileparse
python server.py
```

服务将运行在 `http://localhost:5000`

### 2. 启动 Node.js 后端

```bash
cd backend/autoprovider
node app.js
```

服务将运行在 `http://localhost:3019`

### 3. 启动前端开发服务器

```bash
cd autoprovider
npm run dev
```

## ✨ 功能演示

### 上传文件的三种方式

1. **点击附件按钮** 📎

   - 点击输入框右下角的附件按钮
   - 选择一个或多个文件

2. **拖拽上传** 🖱️

   - 直接将文件拖拽到输入框区域
   - 松开鼠标完成上传

3. **点击文件选择器** 📁
   - 通过系统文件选择对话框选择

### 文件状态

上传后，文件会自动经历以下状态：

```
等待上传 → 上传中... → 解析中... → 解析完成 ✓
```

- **上传中/解析中**: 显示旋转加载图标 🔄
- **解析完成**: 显示绿色对勾 ✓
- **解析失败**: 显示红色警告图标 ⚠️

### 创建项目

1. 输入项目描述（prompt）
2. 上传相关文件（可选）
3. 等待所有文件解析完成
4. 点击**发送**按钮创建项目

⚠️ **注意**: 只有所有文件都解析完成后，发送按钮才会激活！

## 📋 支持的文件类型

### 文档类型

- Word: `.doc`, `.docx`
- PowerPoint: `.ppt`, `.pptx`
- PDF: `.pdf`
- Excel: `.xls`, `.xlsx`
- Markdown: `.md`
- 文本: `.txt`

### 图片类型

- `.png`, `.jpg`, `.jpeg`
- `.gif`, `.bmp`, `.webp`
- `.svg`, `.ico`

## 🎨 界面特性

### 文件卡片显示

- 文件类型图标
- 文件名和大小
- 实时状态显示
- 删除按钮（仅待上传和失败文件可删除）

### 拖拽提示

拖拽文件时会显示半透明蒙版和上传图标，提示用户释放文件。

## 🔍 调试信息

打开浏览器控制台（F12）可以看到详细的日志：

- 文件选择/拖拽日志
- 上传进度
- 解析结果
- source_id 等信息

Python 服务控制台会显示：

- Token 验证信息
- 文件上传详情
- 七牛云 URL 构建
- AI 解析过程
- 数据库存储结果

## ⚙️ 配置

### 环境变量（可选）

在 `autoprovider/.env` 中配置：

```env
# Python文件解析服务地址
VITE_PYTHON_API_BASE_URL=http://localhost:5000
VITE_PYTHON_API_VERSION=/api/v1
```

### 默认配置

- Python 服务: `http://localhost:5000/api/v1`
- Node.js 服务: `http://localhost:3019/api/v1`

## 🐛 常见问题

### 1. 文件上传失败

- 检查 Python 服务是否正常运行
- 检查 Token 是否有效（需要先登录）
- 查看浏览器控制台错误信息

### 2. 解析卡住

- 查看 Python 服务控制台日志
- 确认文件格式是否支持
- 检查七牛云配置是否正确

### 3. 发送按钮不可用

- 确保所有文件都显示"解析完成"
- 确保输入了 prompt 文本
- 检查是否有文件解析失败（红色状态）

### 4. URL 格式错误（400 错误）

Python 服务会自动验证 URL 格式，如果出现此错误：

- 查看 Python 服务日志中的 URL 构建信息
- 确认七牛云配置正确（bucket 名、域名等）

## 📚 详细文档

查看 `autoprovider/docs/FILE_UPLOAD_INTEGRATION.md` 获取完整的技术文档。

## 🎉 开始使用

1. 启动所有服务
2. 访问 `http://localhost:5173`（或您的前端端口）
3. 登录账号
4. 开始上传文件和创建项目！

祝您使用愉快！🚀
