## 创建文件

```json
[
  {
    "type": "function",
    "function": {
      "name": "create_file",
      "description": "Create a file or folder at the specified path. If creating a file inside a folder, ensure the folder is created first. Folder paths must end with '.floder'. Multiple files/folders can be created in one call by providing multiple FILE-NAME entries.Must provide a complete path, starting from the root directory, such as/frontend/src/views/login.vue. Stands for create a login.vue",
      "parameters": {
        "type": "object",
        "properties": {
          "file_names": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of file or folder paths to create. Folder paths should end with '.floder'. File paths should include extension (e.g., .vue, .js)."
          }
        },
        "required": ["file_names"]
      }
    }
  }
]
```

## 删除文件

```json
[
  {
    "type": "function",
    "function": {
      "name": "delete_file",
      "description": "Delete a file or folder at the specified path. Folders must end with '.floder'. Deleting a folder will recursively remove all its contents. Multiple files/folders can be deleted in one call. Paths must exist; operation fails if any path is invalid.Must provide a full path starting from the root directory, such as/frontend/src/views/login.vue. Represents deleting a login.vue",
      "parameters": {
        "type": "object",
        "properties": {
          "file_paths": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of absolute file or folder paths to delete. Folder paths must use '.floder' suffix. Order matters when deleting nested items (delete children before parent if needed)."
          }
        },
        "required": ["file_paths"]
      }
    }
  }
]
```

## 编辑文件

```json
[
  {
    "type": "function",
    "function": {
      "name": "edit_file",
      "description": "Edit a file by specifying positional anchors and content modifications. Each operation targets a single file using a full path. Multiple EDIT-OPERATIONs are applied sequentially to the same file. Anchors must uniquely identify the edit location. Use <+> to insert lines after the front anchor (or before back anchor), <-> to delete matching lines. File must exist. Operations execute in order; each subsequent operation sees the result of the previous.",
      "parameters": {
        "type": "object",
        "properties": {
          "file_path": {
            "type": "string",
            "description": "Absolute path of the file to edit, including extension (e.g., /frontend/src/components/loginPannle/loginPannle.vue)"
          },
          "operations": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "front_position": {
                  "type": "string",
                  "description": "The exact preceding line(s) or anchor text immediately before the target block. Empty string means start of file."
                },
                "back_position": {
                  "type": "string",
                  "description": "The exact succeeding line(s) or anchor text immediately after the target block. Empty string means end of file."
                },
                "content": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Lines of content to modify, each prefixed with an edit marker: '<+>' for insertion, '<->' for deletion. Markers apply per-line."
                }
              },
              "required": ["front_position", "back_position", "content"]
            }
          }
        },
        "required": ["file_path", "operations"]
      }
    }
  }
]
```

## 阅读文件

```json
[
  {
    "type": "function",
    "function": {
      "name": "read_file",
      "description": "Read the content of one or more files. Only files with extensions are allowed (folders cannot be read). Multiple files can be read in a single call by providing their full paths.,
      "parameters": {
        "type": "object",
        "properties": {
          "file_paths": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of absolute file paths to read, each including extension (e.g., /frontend/src/components/loginPannle/loginPannle.vue). Folder paths are invalid and will cause an error."
          }
        },
        "required": ["file_paths"]
      }
    }
  }
]
```

## 网络搜索

```json
[
  {
    "type": "function",
    "function": {
      "name": "web_search",
      "description": "Perform web searches to retrieve information based on given keywords or topics. Multiple independent search queries can be executed in a single call.",
      "parameters": {
        "type": "object",
        "properties": {
          "queries": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of search queries (keywords/phrases) to execute on the web. Each SEARCH_CONTENT becomes one query item."
          }
        },
        "required": ["queries"]
      }
    }
  }
]
```

## 链接阅读

```json
[
  {
    "type": "function",
    "function": {
      "name": "web_read",
      "description": "Fetch and read the content of a given public URL (e.g., http/https links). Supports reading web pages, JSON APIs, text files, etc. Multiple URLs can be processed in a single call. Returns the raw text or structured content (if applicable) from the URL.",
      "parameters": {
        "type": "object",
        "properties": {
          "urls": {
            "type": "array",
            "items": {
              "type": "string",
              "format": "uri"
            },
            "description": "List of valid HTTP/HTTPS URLs to fetch and read content from (e.g., ['https://example.com/data.json', 'https://api.github.com/repos/autoprovider/info'])."
          }
        },
        "required": ["urls"]
      }
    }
  }
]
```

## sql操作

```json
[
  {
    "type": "function",
    "function": {
      "name": "sql_operation",
      "description": "Execute a SQL command on the managed database environment. All SQL operations must be compatible with the existing schema and state tracked in the system's sql-operationed log. Only one SQL statement per call is supported (e.g., CREATE, ALTER, INSERT, UPDATE, DELETE, SELECT).",
      "parameters": {
        "type": "object",
        "properties": {
          "sql": {
            "type": "string",
            "description": "A valid SQL statement to execute (e.g., CREATE TABLE, INSERT INTO, SELECT, etc.). Must conform to the current database schema and constraints."
          }
        },
        "required": ["sql"]
      }
    }
  }
]
```

## 命令行操作

```json
[
  {
    "type": "function",
    "function": {
      "name": "bash_operation",
      "description": "Execute one or more bash commands in a specified working directory on a Linux-Ubuntu system. Commands run sequentially in the order provided. Safety restrictions apply: destructive operations (e.g., rm -rf, system modifications) are blocked. Working directory must exist.",
      "parameters": {
        "type": "object",
        "properties": {
          "commands": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "working_directory": {
                  "type": "string",
                  "description": "Absolute path where the command should be executed (e.g., /frontend)"
                },
                "instruction": {
                  "type": "string",
                  "description": "The bash command to run (e.g., 'npm install axios'). Must be non-destructive and safe."
                }
              },
              "required": ["working_directory", "instruction"]
            }
          },
          "description": "List of bash operations to execute sequentially. Each includes a working directory and a safe shell command."
        }
      },
      "required": ["commands"]
    }
  }
]
```



## 创建todolist

```json
[
  {
    "type": "function",
    "function": {
      "name": "create_todolist",
      "description": "Create a new todolist with a structured name and multiple todo items. The todolist name must follow the format: 'project-id-timestamp-todolist-name'. Multiple TODO items can be included within a single call.",
      "parameters": {
        "type": "object",
        "properties": {
          "todolist_name": {
            "type": "string",
            "description": "The name of the todolist, must follow the format: 'project-id'-'timestamp'-'todolist-name' (e.g., '100001-1740321211-新任务')"
          },
          "todos": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "title": {
                  "type": "string",
                  "description": "The title/description of the todo item"
                }
              },
              "required": ["title"]
            },
            "description": "List of todo items to include in the todolist. Each item must have a 'title'."
          }
        },
        "required": ["todolist_name", "todos"]
      }
    }
  }
]
```



## 完成todo

```json
[
  {
    "type": "function",
    "function": {
      "name": "done_todo",
      "description": "Mark specified todo items as completed within a given todolist. The todolist is identified by its structured name (e.g., 'project-id-timestamp-todolist-name'), and each todo item is matched by its title. Only todos present in the list will be marked as done.",
      "parameters": {
        "type": "object",
        "properties": {
          "todolist_name": {
            "type": "string",
            "description": "The name of the target todolist in the format 'project-id-timestamp-todolist-name' (e.g., '100001-1740321211-新任务')"
          },
          "todos": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "title": {
                  "type": "string",
                  "description": "The title of the todo item to be marked as done"
                }
              },
              "required": ["title"]
            },
            "description": "List of todo items (by title) to mark as completed within the specified todolist"
          }
        },
        "required": ["todolist_name", "todos"]
      }
    }
  }
]
```



## linter检查

```json
[
  {
    "type": "function",
    "function": {
      "name": "linter",
      "description": "Run an automated linter check on all project code files. No parameters required. Executes linting rules (e.g., style, syntax, best practices) across the entire codebase and reports issues. Safe, read-only operation.",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  }
]
```



## 项目部署

```json
[
  {
    "type": "function",
    "function": {
      "name": "deploy",
      "description": "Automatically deploy the current project to the production/staging environment. No parameters required. Performs build, testing, and deployment steps in a safe, predefined pipeline. This is a high-impact operation; ensure all validations pass before calling.",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  }
]
```

## 项目命名

```json
[
  {
    "type": "function",
    "function": {
      "name": "generate_project_name",
      "description": "Generate a unique, trademark-friendly, and globally culturally safe project name based on the provided core domain or function. The name must be concise, memorable, hint at the project's purpose, and avoid existing brand conflicts. Uses creative word blending, metaphor, or keyword combination strategies. Returns a single recommended name.",
      "parameters": {
        "type": "object",
        "properties": {
          "core_concept": {
            "type": "string",
            "description": "The central domain, functionality, or mission of the project (e.g., 'real-time collaborative AI', 'decentralized identity management')."
          }
        },
        "required": ["core_concept"]
      }
    }
  }
]
```

## 会话命名

```json
[
  {
    "type": "function",
    "function": {
      "name": "generate_conversation_name",
      "description": "Generate a verb-driven, concise, and contextually meaningful name for a conversation thread based solely on a user-provided descriptive phrase. The input phrase is interpreted and transformed into an imperative-action name (e.g., '修复登录Bug' → 'fix-login-bug'), using kebab-case, active verbs, and task-focused semantics. Designed for direct use in conversation naming flows—callers pass a single descriptive string.",
      "parameters": {
        "type": "object",
        "properties": {
          "description": {
            "type": "string",
            "description": "A natural language phrase describing the conversation's purpose or action, e.g., '实现搜索功能', '调试支付失败问题', '重构用户模块'."
          }
        },
        "required": ["description"]
      }
    }
  }
]
```

