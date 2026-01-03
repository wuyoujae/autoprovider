# 文件上传解析功能前端集成说明

## 概述

已成功将 Python 后端的文件上传解析接口集成到前端 Vue 项目中，实现了完整的文件上传、解析、状态展示流程。

## 功能特性

### 1. 自动上传解析

- 用户选择或拖拽文件后，自动开始上传和解析
- 无需等待用户点击发送按钮
- 实时显示上传和解析进度

### 2. 状态管理

文件上传解析过程有以下 5 种状态：

- **pending**: 等待上传（初始状态）
- **uploading**: 上传中
- **parsing**: 解析中
- **completed**: 解析完成
- **error**: 解析失败

### 3. 视觉反馈

- 每个文件都有独立的状态显示
- 上传/解析中显示旋转动画
- 完成后显示绿色勾号
- 失败时显示红色警告图标
- 状态文本实时更新

### 4. 智能按钮控制

- 只有当所有文件都解析完成时，发送按钮才可用
- 防止用户在文件未解析完成时创建项目

## 技术实现

### API 配置

#### 文件位置

`autoprovider/src/api/fc_api.js`

#### 配置说明

```javascript
// Python文件解析服务的配置（独立端口5000）
const pythonBaseUrl = "http://localhost:5000";
const pythonAPIversion = "/api/v1";

const FcAPI = {
  inter: {
    upload_and_parse: buildPythonUrl("/inter/upload_and_parse"),
  },
};
```

#### 环境变量支持

可以通过环境变量配置 Python 服务地址：

- `VITE_PYTHON_API_BASE_URL`: Python 服务基础 URL（默认：http://localhost:5000）
- `VITE_PYTHON_API_VERSION`: Python API 版本（默认：/api/v1）

### 组件结构

#### 1. welcome-prompt.vue（主组件）

**路径**: `autoprovider/src/components/views/welcome/prompt/welcome-prompt.vue`

**核心功能**:

- 文件选择和拖拽处理
- 自动上传和解析逻辑
- 状态管理
- 项目创建流程控制

**关键方法**:

```typescript
// 上传并解析单个文件
upload_and_parse_file(file_item: UploadedFile): Promise<void>

// 上传并解析所有待处理文件
upload_all_files(): Promise<boolean>

// 检查所有文件是否解析完成
all_files_completed: ComputedRef<boolean>
```

#### 2. uploadfile-item.vue（文件项组件）

**路径**: `autoprovider/src/components/views/welcome/prompt/uploadfile-item.vue`

**核心功能**:

- 文件信息展示
- 状态可视化
- 文件类型图标识别
- 删除操作（仅 pending 和 error 状态可删除）

**Props**:

```typescript
interface Props {
  file: File; // 文件对象
  status?: string; // 状态
  progress?: number; // 进度
  source_id?: string; // 服务器返回的source_id
  error_message?: string; // 错误信息
}
```

## 数据流程

### 1. 文件上传流程

```
用户选择/拖拽文件
    ↓
创建UploadedFile对象（status: pending）
    ↓
添加到uploaded_files数组
    ↓
watch监听到数组变化
    ↓
自动调用upload_and_parse_file
    ↓
status: uploading → parsing → completed
    ↓
获取source_id并存储
```

### 2. 项目创建流程

```
用户点击发送按钮
    ↓
检查所有文件是否解析完成
    ↓
收集所有source_id
    ↓
调用createproject接口
    ↓
传递prompt和source_list
    ↓
创建成功，跳转到work页面
```

## 接口交互

### 上传解析接口

**请求**:

```javascript
POST http://localhost:5000/api/v1/inter/upload_and_parse
Content-Type: multipart/form-data
Authorization: Bearer {token}

FormData:
  files: [File对象]
```

**响应**:

```javascript
{
  status: 0,  // 0成功，1失败
  message: "文件上传并解析成功",
  data: [
    {
      source_id: "uuid-string",
      source_url: "https://...",  // 图片URL，文档为空字符串
      source_type: "png/docx/...",
      // ... 其他信息
    }
  ]
}
```

### 创建项目接口

**请求**:

```javascript
POST http://localhost:3019/api/v1/projectinfo/createproject
Content-Type: application/json
Authorization: Bearer {token}

{
  prompt: "用户输入的prompt",
  source_list: ["source_id1", "source_id2", ...]
}
```

## 用户体验优化

### 1. 实时反馈

- 文件选择后立即显示在界面上
- 上传和解析过程有明确的状态提示
- 使用旋转动画表示处理中

### 2. 错误处理

- 上传失败的文件显示错误状态
- 可以删除失败的文件重新上传
- 不影响其他文件的上传

### 3. 防止误操作

- 文件解析中不允许删除
- 所有文件未解析完成时，发送按钮禁用
- 清晰的视觉提示引导用户

## 样式设计

### 状态颜色

- **上传/解析中**: #FEEEDE（辅助色）
- **完成**: #7ED321（绿色）
- **失败**: #FDC4C4（辅助色）

### 动画效果

- 旋转动画（上传/解析中）
- 淡入淡出效果
- 无 transform 和边框变化（符合设计规范）

## 测试建议

### 1. 功能测试

- [ ] 单文件上传
- [ ] 多文件上传
- [ ] 拖拽上传
- [ ] 文档类型（docx, pptx, pdf 等）
- [ ] 图片类型（png, jpg 等）
- [ ] 大文件上传（测试进度显示）
- [ ] 上传失败处理
- [ ] 删除文件

### 2. 用户体验测试

- [ ] 状态变化是否流畅
- [ ] 加载动画是否正常
- [ ] 按钮禁用/启用时机是否合理
- [ ] 错误提示是否清晰

### 3. 集成测试

- [ ] Python 服务未启动时的错误处理
- [ ] Token 过期时的处理
- [ ] 网络异常时的处理
- [ ] 项目创建流程完整性

## 注意事项

### 1. 服务端口

Python 文件解析服务运行在**5000 端口**，与 Node.js 服务（3019 端口）不同。

### 2. Token 认证

上传接口需要 Token 认证，确保用户已登录。

### 3. 并发上传

当前实现支持多文件并发上传，提高用户体验。

### 4. 错误处理

建议在生产环境中添加更详细的错误日志和用户提示。

## 未来优化方向

1. **上传进度条**: 显示准确的上传百分比
2. **文件预览**: 支持图片缩略图预览
3. **文件大小限制**: 前端预先验证文件大小
4. **文件类型限制**: 前端预先验证文件类型
5. **批量操作**: 支持全选、全部删除等操作
6. **上传队列**: 控制并发上传数量，避免过载
7. **断点续传**: 大文件上传支持断点续传

## 开发者指南

### 启动开发环境

1. 启动 Python 文件解析服务：

```bash
cd backend/autoprovider/utils/fileparse
python server.py
```

2. 启动 Node.js 后端服务：

```bash
cd backend/autoprovider
node app.js
```

3. 启动前端开发服务器：

```bash
cd autoprovider
npm run dev
```

### 调试技巧

1. 查看 Python 服务日志（详细的调试信息）
2. 查看浏览器控制台（前端日志）
3. 使用 Vue DevTools 查看组件状态
4. 检查 Network 面板的请求和响应

## 总结

文件上传解析功能已完整集成，实现了从前端到后端的完整数据流。用户体验流畅，状态反馈及时，符合现代 Web 应用的标准。
