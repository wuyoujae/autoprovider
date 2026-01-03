# AutoProvider 文档解析服务

## 📋 功能概述

这是一个基于 Flask 的文档和图片解析服务，支持：

- 文档解析（PDF、DOCX、PPT 等）
- 图片 AI 识别和描述
- 七牛云对象存储
- MySQL 数据库存储

## 🔧 环境要求

### Python 版本

- Python 3.8+

### 需要安装的库

```bash
pip install flask
pip install flask-cors
pip install pymysql
pip install pillow
pip install qiniu
pip install docling
pip install openai
```

## 📁 文件结构

```
fileparse/
├── server.py          # Flask服务器主文件，包含API路由和数据库操作
├── upload7niu.py      # 七牛云上传功能模块
├── parsedoc.py        # 文档解析模块（Docling）
├── parseimg.py        # 图片AI解析模块（视觉大模型）
└── README.md          # 本文件
```

## ⚙️ 配置说明

### 1. 七牛云配置（upload7niu.py）

```python
QINIU_ACCESS_KEY = 'your_access_key'
QINIU_SECRET_KEY = 'your_secret_key'
QINIU_BUCKET_NAME = 'autoprovider'
QINIU_DOMAIN = 't4vr0t8sh.hn-bkt.clouddn.com'
```

目录结构：`project/static/image/`

### 2. 数据库配置（server.py）

```python
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '123456',
    'database': 'autoprovider',
    'charset': 'utf8mb4'
}
```

### 3. AI 视觉模型配置（parseimg.py）

```python
BASE_URL = "https://api.mindcraft.com.cn/v1/"
API_KEY = "MC-0D536FE8EBF54C508EBD58A600C20B44"
MODEL = "qwen-vl-plus-latest"
```

## 🚀 启动服务

```bash
cd backend/autoprovider/utils/fileparse
python server.py
```

服务将在 `http://0.0.0.0:5000` 启动

## 📡 API 接口

### 1. 上传并解析文件

**接口地址**: `/api/v1/inter/upload_and_parse`  
**请求方式**: POST  
**Content-Type**: multipart/form-data

**请求参数**:

- `files`: 文件列表（必需）
- `project_id`: 项目 ID（可选）

**请求示例**:

```bash
curl -X POST http://localhost:5000/api/v1/inter/upload_and_parse \
  -F "files=@document.pdf" \
  -F "files=@image.png" \
  -F "project_id=project-123"
```

**成功返回示例**:

```json
{
  "status": 0,
  "message": "成功处理2个文件",
  "data": [
    {
      "source_id": "uuid-1",
      "source_url": "",
      "source_type": "pdf",
      "filename": "document.pdf",
      "content_length": 1234,
      "extracted_images": 2,
      "images": [
        {
          "source_id": "uuid-2",
          "source_url": "https://xxx.com/image.png",
          "source_type": "png",
          "ai_description": "这是一张..."
        }
      ]
    },
    {
      "source_id": "uuid-3",
      "source_url": "https://xxx.com/image2.png",
      "source_type": "png",
      "ai_description": "图片内容描述...",
      "width": 800,
      "height": 600
    }
  ]
}
```

**失败返回示例**:

```json
{
  "status": 1,
  "message": "错误信息",
  "data": "fail"
}
```

### 2. 测试数据库连接

**接口地址**: `/api/v1/test/db_connection`  
**请求方式**: GET

### 3. 测试七牛云连接

**接口地址**: `/api/v1/test/qiniu_connection`  
**请求方式**: GET

## 🔄 解析流程

### 文档处理流程

1. 用户上传文档（PDF、DOCX 等）
2. Docling 解析文档内容为 Markdown
3. 提取文档中的图片
4. 将图片上传到七牛云
5. 使用 AI 视觉模型解析图片内容
6. 将文档内容和图片信息存储到 MySQL 的`source_list`表
7. 返回`source_id`、`source_url`、`source_type`等信息

### 图片处理流程

1. 用户上传图片
2. 上传到七牛云
3. 使用 AI 视觉模型解析图片内容
4. 存储到 MySQL 的`source_list`表
5. 返回`source_id`、`source_url`、`source_type`等信息

## 📊 数据库表结构

### source_list 表

| 字段           | 类型         | 说明                       |
| -------------- | ------------ | -------------------------- |
| source_id      | VARCHAR(50)  | 资源 ID（主键）            |
| source_url     | VARCHAR(500) | 资源 URL（图片才有）       |
| source_type    | VARCHAR(50)  | 资源类型（pdf、png 等）    |
| project_id     | VARCHAR(50)  | 项目 ID（可选）            |
| source_status  | TINYINT      | 资源状态（0-正常，1-删除） |
| create_time    | DATETIME     | 创建时间                   |
| source_content | LONGTEXT     | 资源内容（解析结果）       |

## 🎯 支持的文件格式

### 文档类型

- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.pptx)
- Markdown (.md)
- Text (.txt)
- HTML (.html)
- CSV (.csv)
- JSON (.json)

### 图片类型

- PNG (.png)
- JPEG (.jpg, .jpeg)
- TIFF (.tiff, .tif)
- BMP (.bmp)
- GIF (.gif)
- WebP (.webp)

## ⚠️ 注意事项

1. **文件大小限制**: 单个文件最大 5MB
2. **project_id**: 可选参数，如果传入会验证项目是否存在
3. **文档存储**: 文档本身不上传到七牛云，只存解析后的内容
4. **图片存储**: 图片会上传到七牛云并记录 URL
5. **批量处理**: 支持一次上传多个文件，返回数组格式

## 🐛 调试

服务运行时会在控制台输出详细日志：

- 文件处理进度
- 数据库操作结果
- 七牛云上传状态
- AI 解析进度

## 📝 日志示例

```
开始处理2个文件...
处理第1/2个文件: document.pdf (类型: pdf)
开始解析文档: document.pdf
文档解析完成，内容长度: 1234
图片上传成功: https://xxx.com/image.png
开始AI解析图片 1...
图片解析完成并存入数据库: uuid-123
文档解析完成，source_id: uuid-456
```
