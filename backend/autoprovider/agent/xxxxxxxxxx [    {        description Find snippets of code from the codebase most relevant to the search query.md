```cursor
[
    {
        "description": "Find snippets of code from the codebase most relevant to the search query.\nThis is a semantic search tool, so the query should ask for something semantically matching what is needed.\nIf it makes sense to only search in particular directories, please specify them in the target_directories field.\nUnless there is a clear reason to use your own search query, please just reuse the user's exact query with their wording.\nTheir exact wording/phrasing can often be helpful for the semantic search query. Keeping the same exact question format can also be helpful.",
        "name": "codebase_search",
        "parameters": {
            "properties": {
                "explanation": {
                    "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal.",
                    "type": "string"
                },
                "query": {
                    "description": "The search query to find relevant code. You should reuse the user's exact query/most recent message with their wording unless there is a clear reason not to.",
                    "type": "string"
                },
                "target_directories": {
                    "description": "Glob patterns for directories to search over",
                    "items": {
                        "type": "string"
                    },
                    "type": "array"
                }
            },
            "required": [
                "query"
            ],
            "type": "object"
        }
    },
    {
        "description": "Read the contents of a file. the output of this tool call will be the 1-indexed file contents from start_line_one_indexed to end_line_one_indexed_inclusive, together with a summary of the lines outside start_line_one_indexed and end_line_one_indexed_inclusive.\nNote that this call can view at most 250 lines at a time and 200 lines minimum.\n\nWhen using this tool to gather information, it's your responsibility to ensure you have the COMPLETE context. Specifically, each time you call this command you should:\n1) Assess if the contents you viewed are sufficient to proceed with your task.\n2) Take note of where there are lines not shown.\n3) If the file contents you have viewed are insufficient, and you suspect they may be in lines not shown, proactively call the tool again to view those lines.\n4) When in doubt, call this tool again to gather more information. Remember that partial file views may miss critical dependencies, imports, or functionality.\n\nIn some cases, if reading a range of lines is not enough, you may choose to read the entire file.\nReading entire files is often wasteful and slow, especially for large files (i.e. more than a few hundred lines). So you should use this option sparingly.\nReading the entire file is not allowed in most cases. You are only allowed to read the entire file if it has been edited or manually attached to the conversation by the user.",
        "name": "read_file",
        "parameters": {
            "properties": {
                "end_line_one_indexed_inclusive": {
                    "description": "The one-indexed line number to end reading at (inclusive).",
                    "type": "integer"
                },
                "explanation": {
                    "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal.",
                    "type": "string"
                },
                "should_read_entire_file": {
                    "description": "Whether to read the entire file. Defaults to false.",
                    "type": "boolean"
                },
                "start_line_one_indexed": {
                    "description": "The one-indexed line number to start reading from (inclusive).",
                    "type": "integer"
                },
                "target_file": {
                    "description": "The path of the file to read. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is.",
                    "type": "string"
                }
            },
            "required": [
                "target_file",
                "should_read_entire_file",
                "start_line_one_indexed",
                "end_line_one_indexed_inclusive"
            ],
            "type": "object"
        }
    },
    {
        "description": "PROPOSE a command to run on behalf of the user.\nIf you have this tool, note that you DO have the ability to run commands directly on the USER's system.\nNote that the user will have to approve the command before it is executed.\nThe user may reject it if it is not to their liking, or may modify the command before approving it.  If they do change it, take those changes into account.\nThe actual command will NOT execute until the user approves it. The user may not approve it immediately. Do NOT assume the command has started running.\nIf the step is WAITING for user approval, it has NOT started running.\nIn using these tools, adhere to the following guidelines:\n1. Based on the contents of the conversation, you will be told if you are in the same shell as a previous step or a different shell.\n2. If in a new shell, you should `cd` to the appropriate directory and do necessary setup in addition to running the command.\n3. If in the same shell, LOOK IN CHAT HISTORY for your current working directory.\n4. For ANY commands that would require user interaction, ASSUME THE USER IS NOT AVAILABLE TO INTERACT and PASS THE NON-INTERACTIVE FLAGS (e.g. --yes for npx).\n5. If the command would use a pager, append ` | cat` to the command.\n6. For commands that are long running/expected to run indefinitely until interruption, please run them in the background. To run jobs in the background, set `is_background` to true rather than changing the details of the command.\n7. Dont include any newlines in the command.",
        "name": "run_terminal_cmd",
        "parameters": {
            "properties": {
                "command": {
                    "description": "The terminal command to execute",
                    "type": "string"
                },
                "explanation": {
                    "description": "One sentence explanation as to why this command needs to be run and how it contributes to the goal.",
                    "type": "string"
                },
                "is_background": {
                    "description": "Whether the command should be run in the background",
                    "type": "boolean"
                }
            },
            "required": [
                "command",
                "is_background"
            ],
            "type": "object"
        }
    },
    {
        "description": "List the contents of a directory. The quick tool to use for discovery, before using more targeted tools like semantic search or file reading. Useful to try to understand the file structure before diving deeper into specific files. Can be used to explore the codebase.",
        "name": "list_dir",
        "parameters": {
            "properties": {
                "explanation": {
                    "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal.",
                    "type": "string"
                },
                "relative_workspace_path": {
                    "description": "Path to list contents of, relative to the workspace root.",
                    "type": "string"
                }
            },
            "required": [
                "relative_workspace_path"
            ],
            "type": "object"
        }
    },
    {
        "description": "### Instructions:\nThis is best for finding exact text matches or regex patterns.\nThis is preferred over semantic search when we know the exact symbol/function name/etc. to search in some set of directories/file types.\n\nUse this tool to run fast, exact regex searches over text files using the `ripgrep` engine.\nTo avoid overwhelming output, the results are capped at 50 matches.\nUse the include or exclude patterns to filter the search scope by file type or specific paths.\n\n- Always escape special regex characters: ( ) [ ] { } + * ? ^ $ | . \\\n- Use `\\` to escape any of these characters when they appear in your search string.\n- Do NOT perform fuzzy or semantic matches.\n- Return only a valid regex pattern string.\n\n### Examples:\n| Literal               | Regex Pattern            |\n|-----------------------|--------------------------|\n| function(             | function\\(              |\n| value[index]          | value\\[index\\]         |\n| file.txt               | file\\.txt                |\n| user|admin            | user\\|admin             |\n| path\\to\\file         | path\\\\to\\\\file        |\n| hello world           | hello world              |\n| foo\\(bar\\)          | foo\\\\(bar\\\\)         |",
        "name": "grep_search",
        "parameters": {
            "properties": {
                "case_sensitive": {
                    "description": "Whether the search should be case sensitive",
                    "type": "boolean"
                },
                "exclude_pattern": {
                    "description": "Glob pattern for files to exclude",
                    "type": "string"
                },
                "explanation": {
                    "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal.",
                    "type": "string"
                },
                "include_pattern": {
                    "description": "Glob pattern for files to include (e.g. '*.ts' for TypeScript files)",
                    "type": "string"
                },
                "query": {
                    "description": "The regex pattern to search for",
                    "type": "string"
                }
            },
            "required": [
                "query"
            ],
            "type": "object"
        }
    },
    {
        "description": "Use this tool to propose an edit to an existing file or create a new file.\n\nThis will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.\nWhen writing the edit, you should specify each edit in sequence, with the special comment `// ... existing code ...` to represent unchanged code in between edited lines.\n\nFor example:\n\n```\n// ... existing code ...\nFIRST_EDIT\n// ... existing code ...\nSECOND_EDIT\n// ... existing code ...\nTHIRD_EDIT\n// ... existing code ...\n```\n\nYou should still bias towards repeating as few lines of the original file as possible to convey the change.\nBut, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity.\nDO NOT omit spans of pre-existing code (or comments) without using the `// ... existing code ...` comment to indicate its absence. If you omit the existing code comment, the model may inadvertently delete these lines.\nMake sure it is clear what the edit should be, and where it should be applied.\nTo create a new file, simply specify the content of the file in the `code_edit` field.\n\nYou should specify the following arguments before the others: [target_file]\n\nALWAYS make all edits to a file in a single edit_file instead of multiple edit_file calls to the same file. The apply model can handle many distinct edits at once. When editing multiple files, ALWAYS make parallel edit_file calls.",
        "name": "edit_file",
        "parameters": {
            "properties": {
                "code_edit": {
                    "description": "Specify ONLY the precise lines of code that you wish to edit. **NEVER specify or write out unchanged code**. Instead, represent all unchanged code using the comment of the language you're editing in - example: `// ... existing code ...`",
                    "type": "string"
                },
                "instructions": {
                    "description": "A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist the less intelligent model in applying the edit. Please use the first person to describe what you are going to do. Dont repeat what you have said previously in normal messages. And use it to disambiguate uncertainty in the edit.",
                    "type": "string"
                },
                "target_file": {
                    "description": "The target file to modify. Always specify the target file as the first argument. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is.",
                    "type": "string"
                }
            },
            "required": [
                "target_file",
                "instructions",
                "code_edit"
            ],
            "type": "object"
        }
    },
    {
        "description": "Use this tool to propose a search and replace operation on an existing file.\n\nThe tool will replace ONE occurrence of old_string with new_string in the specified file.\n\nCRITICAL REQUIREMENTS FOR USING THIS TOOL:\n\n1. UNIQUENESS: The old_string MUST uniquely identify the specific instance you want to change. This means:\n   - Include AT LEAST 3-5 lines of context BEFORE the change point\n   - Include AT LEAST 3-5 lines of context AFTER the change point\n   - Include all whitespace, indentation, and surrounding code exactly as it appears in the file\n\n2. SINGLE INSTANCE: This tool can only change ONE instance at a time. If you need to change multiple instances:\n   - Make separate calls to this tool for each instance\n   - Each call must uniquely identify its specific instance using extensive context\n\n3. VERIFICATION: Before using this tool:\n   - If multiple instances exist, gather enough context to uniquely identify each one\n   - Plan separate tool calls for each instance\n",
        "name": "search_replace",
        "parameters": {
            "properties": {
                "file_path": {
                    "description": "The path to the file you want to search and replace in. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is.",
                    "type": "string"
                },
                "new_string": {
                    "description": "The edited text to replace the old_string (must be different from the old_string)",
                    "type": "string"
                },
                "old_string": {
                    "description": "The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)",
                    "type": "string"
                }
            },
            "required": [
                "file_path",
                "old_string",
                "new_string"
            ],
            "type": "object"
        }
    },
    {
        "description": "Fast file search based on fuzzy matching against file path. Use if you know part of the file path but don't know where it's located exactly. Response will be capped to 10 results. Make your query more specific if need to filter results further.",
        "name": "file_search",
        "parameters": {
            "properties": {
                "explanation": {
                    "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal.",
                    "type": "string"
                },
                "query": {
                    "description": "Fuzzy filename to search for",
                    "type": "string"
                }
            },
            "required": [
                "query",
                "explanation"
            ],
            "type": "object"
        }
    },
    {
        "description": "Deletes a file at the specified path. The operation will fail gracefully if:\n    - The file doesn't exist\n    - The operation is rejected for security reasons\n    - The file cannot be deleted",
        "name": "delete_file",
        "parameters": {
            "properties": {
                "explanation": {
                    "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal.",
                    "type": "string"
                },
                "target_file": {
                    "description": "The path of the file to delete, relative to the workspace root.",
                    "type": "string"
                }
            },
            "required": [
                "target_file"
            ],
            "type": "object"
        }
    },
    {
        "description": "Calls a smarter model to apply the last edit to the specified file.\nUse this tool immediately after the result of an edit_file tool call ONLY IF the diff is not what you expected, indicating the model applying the changes was not smart enough to follow your instructions.",
        "name": "reapply",
        "parameters": {
            "properties": {
                "target_file": {
                    "description": "The relative path to the file to reapply the last edit to. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is.",
                    "type": "string"
                }
            },
            "required": [
                "target_file"
            ],
            "type": "object"
        }
    },
    {
        "description": "Search the web for real-time information about any topic. Use this tool when you need up-to-date information that might not be available in your training data, or when you need to verify current facts. The search results will include relevant snippets and URLs from web pages. This is particularly useful for questions about current events, technology updates, or any topic that requires recent information.",
        "name": "web_search",
        "parameters": {
            "properties": {
                "explanation": {
                    "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal.",
                    "type": "string"
                },
                "search_term": {
                    "description": "The search term to look up on the web. Be specific and include relevant keywords for better results. For technical queries, include version numbers or dates if relevant.",
                    "type": "string"
                }
            },
            "required": [
                "search_term"
            ],
            "type": "object"
        }
    },
    {
        "description": "Creates a Mermaid diagram that will be rendered in the chat UI. Provide the raw Mermaid DSL string via `content`.\nUse <br/> for line breaks, always wrap diagram texts/tags in double quotes, do not use custom colors, do not use :::, and do not use beta features.\nThe diagram will be pre-rendered to validate syntax - if there are any Mermaid syntax errors, they will be returned in the response so you can fix them.",
        "name": "create_diagram",
        "parameters": {
            "properties": {
                "content": {
                    "description": "Raw Mermaid diagram definition (e.g., 'graph TD; A-->B;').",
                    "type": "string"
                }
            },
            "required": [
                "content"
            ],
            "type": "object"
        }
    },
    {
        "description": "Use this tool to edit a jupyter notebook cell. Use ONLY this tool to edit notebooks.\n\nThis tool supports editing existing cells and creating new cells:\n\t- If you need to edit an existing cell, set 'is_new_cell' to false and provide the 'old_string' and 'new_string'.\n\t\t-- The tool will replace ONE occurrence of 'old_string' with 'new_string' in the specified cell.\n\t- If you need to create a new cell, set 'is_new_cell' to true and provide the 'new_string' (and keep 'old_string' empty).\n\t- It's critical that you set the 'is_new_cell' flag correctly!\n\t- This tool does NOT support cell deletion, but you can delete the content of a cell by passing an empty string as the 'new_string'.\n\nOther requirements:\n\t- Cell indices are 0-based.\n\t- 'old_string' and 'new_string' should be a valid cell content, i.e. WITHOUT any JSON syntax that notebook files use under the hood.\n\t- The old_string MUST uniquely identify the specific instance you want to change. This means:\n\t\t-- Include AT LEAST 3-5 lines of context BEFORE the change point\n\t\t-- Include AT LEAST 3-5 lines of context AFTER the change point\n\t- This tool can only change ONE instance at a time. If you need to change multiple instances:\n\t\t-- Make separate calls to this tool for each instance\n\t\t-- Each call must uniquely identify its specific instance using extensive context\n\t- This tool might save markdown cells as \"raw\" cells. Don't try to change it, it's fine. We need it to properly display the diff.\n\t- If you need to create a new notebook, just set 'is_new_cell' to true and cell_idx to 0.\n\t- ALWAYS generate arguments in the following order: target_notebook, cell_idx, is_new_cell, cell_language, old_string, new_string.\n\t- Prefer editing existing cells over creating new ones!\n",
        "name": "edit_notebook",
        "parameters": {
            "properties": {
                "cell_idx": {
                    "description": "The index of the cell to edit (0-based)",
                    "type": "number"
                },
                "cell_language": {
                    "description": "The language of the cell to edit. Should be STRICTLY one of these: 'python', 'markdown', 'javascript', 'typescript', 'r', 'sql', 'shell', 'raw' or 'other'.",
                    "type": "string"
                },
                "is_new_cell": {
                    "description": "If true, a new cell will be created at the specified cell index. If false, the cell at the specified cell index will be edited.",
                    "type": "boolean"
                },
                "new_string": {
                    "description": "The edited text to replace the old_string or the content for the new cell.",
                    "type": "string"
                },
                "old_string": {
                    "description": "The text to replace (must be unique within the cell, and must match the cell contents exactly, including all whitespace and indentation).",
                    "type": "string"
                },
                "target_notebook": {
                    "description": "The path to the notebook file you want to edit. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is.",
                    "type": "string"
                }
            },
            "required": [
                "target_notebook",
                "cell_idx",
                "is_new_cell",
                "cell_language",
                "old_string",
                "new_string"
            ],
            "type": "object"
        }
    }
]
```

```trae
{
  "todo_write": {
    "description": "Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user. It also helps the user understand the progress of the task and overall progress of their requests.",
    "params": {
      "type": "object",
      "properties": {
        "todos": {
          "description": "The updated todo list",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "content": {"type": "string"},
              "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]},
              "id": {"type": "string"},
              "priority": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["content", "status", "id", "priority"],
            "minItems": 3,
            "maxItems": 10
          }
        }
      },
      "required": ["todos"]
    }
  },
  "search_codebase": {
    "description": "This tool is Trae's context engine. It: 1. Takes in a natural language description of the code you are looking for; 2. Uses a proprietary retrieval/embedding model suite that produces the highest-quality recall of relevant code snippets from across the codebase; 3. Maintains a real-time index of the codebase, so the results are always up-to-date and reflects the current state of the codebase; 4. Can retrieve across different programming languages; 5. Only reflects the current state of the codebase on the disk, and has no information on version control or code history.",
    "params": {
      "type": "object",
      "properties": {
        "information_request": {"type": "string"},
        "target_directories": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["information_request"]
    }
  },
  "search_by_regex": {
    "description": "Fast text-based search that finds exact pattern matches within files or directories, utilizing the ripgrep command for efficient searching.",
    "params": {
      "type": "object",
      "properties": {
        "query": {"type": "string"},
        "search_directory": {"type": "string"}
      },
      "required": ["query"]
    }
  },
  "view_files": {
    "description": "View up to 3 files simultaneously in batch mode for faster information gathering.",
    "params": {
      "type": "object",
      "properties": {
        "files": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "file_path": {"type": "string"},
              "start_line_one_indexed": {"type": "integer"},
              "end_line_one_indexed_inclusive": {"type": "integer"},
              "read_entire_file": {"type": "boolean"}
            },
            "required": ["file_path", "start_line_one_indexed", "end_line_one_indexed_inclusive"]
          }
        }
      },
      "required": ["files"]
    }
  },
  "list_dir": {
    "description": "You can use this tool to view files of the specified directory.",
    "params": {
      "type": "object",
      "properties": {
        "dir_path": {"type": "string"},
        "max_depth": {"type": "integer", "default": 3}
      },
      "required": ["dir_path"]
    }
  },
  "write_to_file": {
    "description": "You can use this tool to write content to a file with precise control over creation/rewrite behavior.",
    "params": {
      "type": "object",
      "properties": {
        "rewrite": {"type": "boolean"},
        "file_path": {"type": "string"},
        "content": {"type": "string"}
      },
      "required": ["rewrite", "file_path", "content"]
    }
  },
  "update_file": {
    "description": "You can use this tool to edit file, if you think that using this tool is more cost-effective than other available editing tools, you should choose this tool, otherwise you should choose other available edit tools.",
    "params": {
      "type": "object",
      "properties": {
        "file_path": {"type": "string"},
        "replace_blocks": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "old_str": {"type": "string"},
              "new_str": {"type": "string"}
            },
            "required": ["old_str", "new_str"]
          }
        }
      },
      "required": ["file_path", "replace_blocks"]
    }
  },
  "edit_file_fast_apply": {
    "description": "You can use this tool to edit an existing files with less than 1000 lines of code, and you should follow these rules:",
    "params": {
      "type": "object",
      "properties": {
        "file_path": {"type": "string"},
        "content": {"type": "string"},
        "instruction": {"type": "string", "default": ""},
        "code_language": {"type": "string"}
      },
      "required": ["file_path", "content"]
    }
  },
  "rename_file": {
    "description": "You can use this tool to move or rename an existing file.",
    "params": {
      "type": "object",
      "properties": {
        "file_path": {"type": "string"},
        "rename_file_path": {"type": "string"}
      },
      "required": ["file_path", "rename_file_path"]
    }
  },
  "delete_file": {
    "description": "You can use this tool to delete files, you can delete multi files in one toolcall, and you MUST make sure the files is exist before deleting.",
    "params": {
      "type": "object",
      "properties": {
        "file_paths": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["file_paths"]
    }
  },
  "run_command": {
    "description": "You can use this tool to PROPOSE a command to run on behalf of the user.",
    "params": {
      "type": "object",
      "properties": {
        "command": {"type": "string"},
        "target_terminal": {"type": "string"},
        "command_type": {"type": "string"},
        "cwd": {"type": "string"},
        "blocking": {"type": "boolean"},
        "wait_ms_before_async": {"type": "integer", "minimum": 0},
        "requires_approval": {"type": "boolean"}
      },
      "required": ["command", "blocking", "requires_approval"]
    }
  },
  "check_command_status": {
    "description": "You can use this tool to get the status of a previously executed command by its Command ID ( non-blocking command ).",
    "params": {
      "type": "object",
      "properties": {
        "command_id": {"type": "string"},
        "wait_ms_before_check": {"type": "integer"},
        "output_character_count": {"type": "integer", "minimum": 0, "default": 1000},
        "skip_character_count": {"type": "integer", "minimum": 0, "default": 0},
        "output_priority": {"type": "string", "default": "bottom"}
      }
    }
  },
  "stop_command": {
    "description": "This tool allows you to terminate a currently running command( the command MUST be previously executed command. ).",
    "params": {
      "type": "object",
      "properties": {
        "command_id": {"type": "string"}
      },
      "required": ["command_id"]
    }
  },
  "open_preview": {
    "description": "You can use this tool to show the available preview URL to user if you have started a local server successfully in a previous toolcall, which user can open it in the browser.",
    "params": {
      "type": "object",
      "properties": {
        "preview_url": {"type": "string"},
        "command_id": {"type": "string"}
      },
      "required": ["preview_url", "command_id"]
    }
  },
  "web_search": {
    "description": "This tool can be used to search the internet, which should be used with caution, as frequent searches result in a bad user experience and excessive costs.",
    "params": {
      "type": "object",
      "properties": {
        "query": {"type": "string"},
        "num": {"type": "int32", "default": 5},
        "lr": {"type": "string"}
      },
      "required": ["query"]
    }
  },
  "finish": {
    "description": "The final tool of this session, when you think you have archived the goal of user requirement, you should use this tool to mark it as finish.",
    "params": {
      "type": "object",
      "properties": {
        "summary": {"type": "string"}
      },
      "required": ["summary"]
    }
  }
}
```

```lovable
{
  "lov-add-dependency": {
    "description": "Use this tool to add a dependency to the project. The dependency should be a valid npm package name.",
    "parameters": {
      "properties": {
        "package": {
          "example": "lodash@latest",
          "type": "string"
        }
      },
      "required": ["package"],
      "type": "object"
    }
  },
  "lov-search-files": {
    "description": "Regex-based code search with file filtering and context.\n\nSearch using regex patterns across files in your project.\n\nParameters:\n- query: Regex pattern to find (e.g., \"useState\")\n- include_pattern: Files to include using glob syntax (e.g., \"src/**\")\n- exclude_pattern: Files to exclude using glob syntax (e.g., \"**/*.test.tsx\")\n- case_sensitive: Whether to match case (default: false)\n\nTip: Use \\\\ to escape special characters in regex patterns.",
    "parameters": {
      "properties": {
        "case_sensitive": {
          "example": "false",
          "type": "boolean"
        },
        "exclude_pattern": {
          "example": "src/components/ui/**",
          "type": "string"
        },
        "include_pattern": {
          "example": "src/**",
          "type": "string"
        },
        "query": {
          "example": "useEffect\\(",
          "type": "string"
        }
      },
      "required": ["query", "include_pattern"],
      "type": "object"
    }
  },
  "lov-write": {
    "description": "\nUse this tool to write to a file. Overwrites the existing file if there is one. The file path should be relative to the project root.\n\n  ### IMPORTANT: MINIMIZE CODE WRITING\n  - PREFER using lov-line-replace for most changes instead of rewriting entire files\n  - This tool is mainly meant for creating new files or as fallback if lov-line-replace fails\n  - When writing is necessary, MAXIMIZE use of \"// ... keep existing code\" to maintain unmodified sections\n  - ONLY write the specific sections that need to change - be as lazy as possible with your writes\n  \n  ### Using \"keep existing code\" (MANDATORY for large unchanged sections):\n  - Any unchanged code block over 5 lines MUST use \"// ... keep existing code\" comment\n  - The comment MUST contain the EXACT string \"... keep existing code\" \n  - Example: \"// ... keep existing code (user interface components)\"\n  - NEVER rewrite large sections of code that don't need to change\n  \n  Example with proper use of keep existing code:\n  ```\n  import React from 'react';\n  import './App.css';\n  \n  function App() {\n    // ... keep existing code (all UI components)\n    \n    // Only the new footer is being added\n    const Footer = () => (\n      New Footer Component\n    );\n    \n    return (\n      \n        // ... keep existing code (main content)\n        \n      \n    );\n  }\n  \n  export default App;\n  ```\n\n  ### Parallel Tool Usage\n  - If you need to create multiple files, it is very important that you create all of them at once instead of one by one, because it's much faster\n",
    "parameters": {
      "properties": {
        "content": {
          "example": "console.log('Hello, World!')",
          "type": "string"
        },
        "file_path": {
          "example": "src/main.ts",
          "type": "string"
        }
      },
      "required": ["file_path", "content"],
      "type": "object"
    }
  },
  "lov-line-replace": {
    "description": "Line-Based Search and Replace Tool\n\nUse this tool to find and replace specific content in a file you have access to, using explicit line numbers. This is the PREFERRED and PRIMARY tool for editing existing files. Always use this tool when modifying existing code rather than rewriting entire files.\n\nProvide the following details to make an edit:\n\t1.\tfile_path - The path of the file to modify\n\t2.\tsearch - The content to search for (use ellipsis ... for large sections instead of writing them out in full)\n\t3.\tfirst_replaced_line - The line number of the first line in the search (1-indexed)\n\t4.\tlast_replaced_line - The line number of the last line in the search (1-indexed)\n\t5.\treplace - The new content to replace the found content\n\nThe tool will validate that search matches the content at the specified line range and then replace it with replace.\n\nIMPORTANT: When invoking this tool multiple times in parallel (multiple edits to the same file), always use the original line numbers from the file as you initially viewed it. Do not adjust line numbers based on previous edits.\n\nELLIPSIS USAGE:\nWhen replacing sections of code longer than ~6 lines, you should use ellipsis (...) in your search to reduce the number of lines you need to specify (writing fewer lines is faster).\n- Include the first few lines (typically 2-3 lines) of the section you want to replace\n- Add \"...\" on its own line to indicate omitted content\n- Include the last few lines (typically 2-3 lines) of the section you want to replace\n- The key is to provide enough unique context at the beginning and end to ensure accurate matching\n- Focus on uniqueness rather than exact line counts - sometimes 2 lines is enough, sometimes you need 4\n\n\n\nExample:\nTo replace a user card component at lines 22-42:\n\nOriginal content in file (lines 20-45):\n20:   return (\n21:     \n22:       \n23:         \n24:         {user.name}\n25:         {user.email}\n26:         {user.role}\n27:         {user.department}\n28:         {user.location}\n29:         \n30:            onEdit(user.id)}>Edit\n31:            onDelete(user.id)}>Delete\n32:            onView(user.id)}>View\n33:         \n34:         \n35:           Created: {user.createdAt}\n36:           Updated: {user.updatedAt}\n37:           Status: {user.status}\n38:         \n39:         \n40:           Permissions: {user.permissions.join(', ')}\n41:         \n42:       \n43:     \n44:   );\n45: }\n\nFor a large replacement like this, you must use ellipsis:\n- search: \"      \\n        \\n...\\n          Permissions: {user.permissions.join(', ')}\\n        \\n      \"\n- first_replaced_line: 22\n- last_replaced_line: 42\n- replace: \"      \\n        \\n           {\\n              e.currentTarget.src = '/default-avatar.png';\\n            }}\\n          />\\n        \\n        \\n          {user.name}\\n          {user.email}\\n          \\n            {user.role}\\n            {user.department}\\n          \\n        \\n        \\n           onEdit(user.id)}\\n            aria-label=\\\"Edit user profile\\\"\\n          >\\n            Edit Profile\\n          \\n        \\n      \"\n\nCritical guidelines:\n\t1. Line Numbers - Specify exact first_replaced_line and last_replaced_line (1-indexed, first line is line 1)\n\t2. Ellipsis Usage - For large sections (>6 lines), use ellipsis (...) to include only the first few and last few key identifying lines for cleaner, more focused matching\n\t3. Content Validation - The prefix and suffix parts of search (before and after ellipsis) must contain exact content matches from the file (without line numbers). The tool validates these parts against the actual file content\n\t4. File Validation - The file must exist and be readable\n\t5. Parallel Tool Calls - When multiple edits are needed, invoke necessary tools simultaneously in parallel. Do NOT wait for one edit to complete before starting the next\n\t6. Original Line Numbers - When making multiple edits to the same file, always use original line numbers from your initial view of the file",
    "parameters": {
      "properties": {
        "file_path": {
          "example": "src/components/TaskList.tsx",
          "type": "string"
        },
        "first_replaced_line": {
          "description": "First line number to replace (1-indexed)",
          "example": "15",
          "type": "number"
        },
        "last_replaced_line": {
          "description": "Last line number to replace (1-indexed)",
          "example": "28",
          "type": "number"
        },
        "replace": {
          "description": "New content to replace the search content with (without line numbers)",
          "example": "  const handleTaskComplete = useCallback((taskId: string) => {\n    const updatedTasks = tasks.map(task =>\n      task.id === taskId \n        ? { ...task, completed: !task.completed, completedAt: new Date() }\n        : task\n    );\n    setTasks(updatedTasks);\n    onTaskUpdate?.(updatedTasks);\n    \n    // Analytics tracking\n    analytics.track('task_completed', { taskId, timestamp: Date.now() });\n  }, [tasks, onTaskUpdate]);",
          "type": "string"
        },
        "search": {
          "description": "Content to search for in the file (without line numbers). This should match the existing code that will be replaced.",
          "example": "  const handleTaskComplete = (taskId: string) => {\n    setTasks(tasks.map(task =>\n...\n    ));\n    onTaskUpdate?.(updatedTasks);\n  };",
          "type": "string"
        }
      },
      "required": ["file_path", "search", "first_replaced_line", "last_replaced_line", "replace"],
      "type": "object"
    }
  },
  "lov-download-to-repo": {
    "description": "Download a file from a URL and save it to the repository.\n\nThis tool is useful for:\n- Downloading images, assets, or other files from URLs. Download images in the src/assets folder and import them as ES6 modules.\n- Saving external resources directly to the project\n- Migrating files from external sources to the repository\n\nThe file will be downloaded and saved at the specified path in the repository, ready to be used in the project.\nIMPORTANT:DO NOT USE this tool to handle the image uploaded by users in the chat and follow the instructions given with the images!\n\n",
    "parameters": {
      "properties": {
        "source_url": {
          "description": "The URL of the file to download",
          "example": "https://example.com/image.png",
          "type": "string"
        },
        "target_path": {
          "description": "The path where the file should be saved in the repository (use the public folder unless specified otherwise)",
          "example": "public/images/logo.png",
          "type": "string"
        }
      },
      "required": ["source_url", "target_path"],
      "type": "object"
    }
  },
  "lov-fetch-website": {
    "description": "Fetches a website and temporarily saves its content (markdown, HTML, screenshot) to files in `tmp://fetched-websites/`. Returns the paths to the created files and a preview of the content.",
    "parameters": {
      "properties": {
        "formats": {
          "description": "Comma-separated list of formats to return. Supported formats: 'markdown', 'html', 'screenshot'. Defaults to 'markdown'.",
          "example": "markdown,screenshot",
          "type": "string"
        },
        "url": {
          "example": "https://example.com",
          "type": "string"
        }
      },
      "required": ["url"],
      "type": "object"
    }
  },
  "lov-copy": {
    "description": "Use this tool to copy a file or directory to a new location. This tool is primarily useful when copying files from a virtual file system (e.g. `user-uploads://`) to the project repo.",
    "parameters": {
      "properties": {
        "destination_file_path": {
          "example": "src/main_copy.ts",
          "type": "string"
        },
        "source_file_path": {
          "example": "src/main.ts",
          "type": "string"
        }
      },
      "required": ["source_file_path", "destination_file_path"],
      "type": "object"
    }
  },
  "lov-view": {
    "description": "Use this tool to read the contents of a file. If it's a project file, the file path should be relative to the project root. You can optionally specify line ranges to read using the lines parameter (e.g., \"1-800, 1001-1500\"). By default, the first 500 lines are read if lines is not specified.\n\nIMPORTANT GUIDELINES:\n- Do NOT use this tool if the file contents have already been provided in \n- Do NOT specify line ranges unless the file is very large (>500 lines) - rely on the default behavior which shows the first 500 lines\n- Only use line ranges when you need to see specific sections of large files that weren't shown in the default view\n- If you need to read multiple files, invoke this tool multiple times in parallel (not sequentially) for efficiency",
    "parameters": {
      "properties": {
        "file_path": {
          "example": "src/App.tsx",
          "type": "string"
        },
        "lines": {
          "example": "1-800, 1001-1500",
          "type": "string"
        }
      },
      "required": ["file_path"],
      "type": "object"
    }
  },
  "lov-read-console-logs": {
    "description": "Use this tool to read the contents of the latest console logs at the moment the user sent the request.\nYou can optionally provide a search query to filter the logs. If empty you will get all latest logs.\nYou may not be able to see the logs that didn't happen recently.\nThe logs will not update while you are building and writing code. So do not expect to be able to verify if you fixed an issue by reading logs again. They will be the same as when you started writing code.\nDO NOT USE THIS MORE THAN ONCE since you will get the same logs each time.",
    "parameters": {
      "properties": {
        "search": {
          "example": "error",
          "type": "string"
        }
      },
      "required": ["search"],
      "type": "object"
    }
  },
  "lov-read-network-requests": {
    "description": "Use this tool to read the contents of the latest network requests. You can optionally provide a search query to filter the requests. If empty you will get all latest requests. You may not be able to see the requests that didn't happen recently.",
    "parameters": {
      "properties": {
        "search": {
          "example": "error",
          "type": "string"
        }
      },
      "required": ["search"],
      "type": "object"
    }
  },
  "lov-remove-dependency": {
    "description": "Use this tool to uninstall a package from the project.",
    "parameters": {
      "properties": {
        "package": {
          "example": "lodash",
          "type": "string"
        }
      },
      "required": ["package"],
      "type": "object"
    }
  },
  "lov-rename": {
    "description": "You MUST use this tool to rename a file instead of creating new files and deleting old ones. The original and new file path should be relative to the project root.",
    "parameters": {
      "properties": {
        "new_file_path": {
          "example": "src/main_new2.ts",
          "type": "string"
        },
        "original_file_path": {
          "example": "src/main.ts",
          "type": "string"
        }
      },
      "required": ["original_file_path", "new_file_path"],
      "type": "object"
    }
  },
  "lov-delete": {
    "description": "Use this tool to delete a file. The file path should be relative to the project root.",
    "parameters": {
      "properties": {
        "file_path": {
          "example": "src/App.tsx",
          "type": "string"
        }
      },
      "required": ["file_path"],
      "type": "object"
    }
  },
  "secrets--add_secret": {
    "description": "Add a new secret such as an API key or token. If any integrations need this secret or a user wants you to use a secret, you can use this tool to add it. This tool ensures that the secret is encrypted and stored properly. Never ask the user to provide the secret value directly instead call this tool to obtain a secret. Any secret you add will be available as environment variables in all backend code you write. IMPORTANT: This is the only way to collect secrets from users, do not add it in any other way.",
    "parameters": {
      "properties": {
        "secret_name": {
          "example": "STRIPE_API_KEY",
          "type": "string"
        }
      },
      "required": ["secret_name"],
      "type": "object"
    }
  },
  "secrets--update_secret": {
    "description": "Update an existing secret such as an API key or token. If any integrations need this secret or a user wants you to use a secret, you can use this tool to update it. This tool ensures that the secret is encrypted and stored properly.",
    "parameters": {
      "properties": {
        "secret_name": {
          "example": "STRIPE_API_KEY",
          "type": "string"
        }
      },
      "required": ["secret_name"],
      "type": "object"
    }
  },
  "supabase--docs-search": {
    "description": "Search official Supabase documentation via the Content API. Returns ranked results with title, slug, URL, and content snippet.\n\nWHEN TO USE:\n- Finding documentation on auth, database, storage, or edge functions\n- Searching for code examples or implementation guides\n\nSEARCH TIPS:\n- Use specific terms like \"row level security\", \"auth policies\", \"storage buckets\"\n- Try different keyword combinations if initial search doesn't yield results\n\nNEXT STEPS:\n- Use 'docs-get' tool with the returned slug to fetch full structured content\n\nEXAMPLES:\n- \"RLS policies\" - returns row level security documentation  \n- \"storage file upload\" - shows file storage implementation docs",
    "parameters": {
      "properties": {
        "max_results": {
          "description": "Max number of results (default 5, capped at 10)",
          "type": "number"
        },
        "query": {
          "description": "Query to search in Supabase documentation",
          "type": "string"
        }
      },
      "required": ["query"],
      "type": "object"
    }
  },
  "supabase--docs-get": {
    "description": "Fetch a complete Supabase documentation page by slug via the Content API. Returns structured content including full markdown, headings outline, and metadata.\n\nWHEN TO USE:\n- After finding a relevant document via 'docs-search'\n- When you have a specific documentation slug/path\n- Need complete implementation details and code examples\n\nINPUT FORMAT:\n- Use the slug from search results (e.g., \"auth/row-level-security\")\n- Format: \"category/subcategory/page-name\"\n\nOUTPUT INCLUDES:\n- Complete markdown content with code snippets\n- Structured headings outline\n\nEXAMPLES:\n- \"auth/row-level-security\" - complete RLS implementation guide\n- \"storage/uploads\" - comprehensive file upload implementation",
    "parameters": {
      "properties": {
        "slug": {
          "description": "Canonical document slug to fetch (e.g. auth/row-level-security)",
          "type": "string"
        }
      },
      "required": ["slug"],
      "type": "object"
    }
  },
  "document--parse_document": {
    "description": "Parse and extract content from documents (first 50 pages). Handles PDFs, Word docs, PowerPoint, Excel, MP3 and many other formats. Preserves document structure, tables, extracts images, and performs OCR on embedded images.",
    "parameters": {
      "properties": {
        "file_path": {
          "description": "The path to the document file to parse",
          "type": "string"
        }
      },
      "required": ["file_path"],
      "type": "object"
    }
  },
  "imagegen--generate_image": {
    "description": "Generates an image based on a text prompt and saves it to the specified file path. Use the best models for large images that are really important. Make sure that you consider aspect ratio given the location of the image on the page when selecting dimensions.\n\nFor small images (less than 1000px), use flux.schnell, it's much faster and really good! This should be your default model.\nWhen you generate large images like a fullscreen image, use flux.dev. The maximum resolution is 1920x1920.\nOnce generated, you MUST import the images in code as ES6 imports.\n\nPrompting tips:\n- Mentioning the aspect ratio in the prompt will help the model generate the image with the correct dimensions. For example: \"A 16:9 aspect ratio image of a sunset over a calm ocean.\"\n- Use the \"Ultra high resolution\" suffix to your prompts to maximize image quality.\n- If you for example are generating a hero image, mention it in the prompt. Example: \"A hero image of a sunset over a calm ocean.\"\n\nExample:\nimport heroImage from \"@/assets/hero-image.jpg\";\n\nIMPORTANT: \n- Dimensions must be between 512 and 1920 pixels and multiples of 32.\n- Make sure to not replace images that users have uploaded by generated images unless they explicitly ask for it.",
    "parameters": {
      "properties": {
        "height": {
          "description": "Image height (minimum 512, maximum 1920)",
          "type": "number"
        },
        "model": {
          "description": "The model to use for generation. Options: flux.schnell (default), flux.dev. flux.dev generates higher quality images but is slower. Always use flux.schnell unless you're generating a large image like a hero image or fullscreen banner, of if the user asks for high quality.",
          "type": "string"
        },
        "prompt": {
          "description": "Text description of the desired image",
          "type": "string"
        },
        "target_path": {
          "description": "The file path where the generated image should be saved. Prefer to put them in the 'src/assets' folder.",
          "type": "string"
        },
        "width": {
          "description": "Image width (minimum 512, maximum 1920)",
          "type": "number"
        }
      },
      "required": ["prompt", "target_path"],
      "type": "object"
    }
  },
  "imagegen--edit_image": {
    "description": "Edits or merges existing images based on a text prompt.\n\nThis tool can work with single or multiple images:\n- Single image: Apply AI-powered edits based on your prompt\n- Multiple images: Merge/combine images according to your prompt\n\nExample prompts for single image:\n- \"make it rainy\"\n- \"change to sunset lighting\"\n- \"add snow\"\n- \"make it more colorful\"\n\nExample prompts for multiple images:\n- \"blend these two landscapes seamlessly\"\n- \"combine the foreground of the first image with the background of the second\"\n- \"merge these portraits into a group photo\"\n- \"create a collage from these images\"\n\n\nThis tool is great for object or character consistency. You can reuse the same image and place it in different scenes for example. If users ask to tweak an existing image, use this tool rather than generating a new image.",
    "parameters": {
      "properties": {
        "image_paths": {
          "description": "Array of paths to existing image files. For single image editing, provide one path. For merging/combining multiple images, provide multiple paths.",
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "prompt": {
          "description": "Text description of how to edit/merge the image(s). For multiple images, describe how they should be combined.",
          "type": "string"
        },
        "target_path": {
          "description": "The file path where the edited/merged image should be saved.",
          "type": "string"
        }
      },
      "required": ["image_paths", "prompt", "target_path"],
      "type": "object"
    }
  },
  "websearch--web_search": {
    "description": "Performs a web search and returns relevant results with text content.\nUse this to find current information, documentation, or any web-based content.\nYou can optionally ask for links or image links to be returned as well.\nYou can also optionally specify a category of search results to return.\nValid categories are (you must use the exact string):\n- \"news\"\n- \"linkedin profile\"\n- \"pdf\"\n- \"github\"\n- \"personal site\"\n- \"financial report\"\n\nThere are no other categories. If you don't specify a category, the search will be general.\n\nWhen to use?\n- When you don't have any information about what the user is asking for.\n- When you need to find current information, documentation, or any web-based content.\n- When you need to find specific technical information, etc.\n- When you need to find information about a specific person, company, or organization.\n- When you need to find information about a specific event, product, or service.\n- When you need to find real (not AI generated) images about a specific person, company, or organization.\n\n** Search guidelines **\n\nYou can filter results to specific domains using \"site:domain.com\" in your query.\nYou can specify multiple domains: \"site:docs.anthropic.com site:github.com API documentation\" will search on both domains.\nYou can search for exact phrases by putting them in double quotes: '\"gpt5\" model name OAI' will include \"gpt5\" in the search.\nYou can exclude specific words by prefixing them with minus: jaguar speed -car will exclude \"car\" from the search.\nFor technical information, the following sources are especially useful: stackoverflow, github, official docs of the product, framework, or service.\nAccount for \"Current date\" in your responses. For example, if you instructions say \"Current date: 2025-07-01\", and the user wants the latest docs, do\nnot use 2024 in the search query. Use 2025!\n",
    "parameters": {
      "properties": {
        "category": {
          "description": "Category of search results to return",
          "type": "string"
        },
        "imageLinks": {
          "description": "Number of image links to return for each result",
          "type": "number"
        },
        "links": {
          "description": "Number of links to return for each result",
          "type": "number"
        },
        "numResults": {
          "description": "Number of search results to return (default: 5)",
          "type": "number"
        },
        "query": {
          "description": "The search query",
          "type": "string"
        }
      },
      "required": ["query"],
      "type": "object"
    }
  },
  "analytics--read_project_analytics": {
    "description": "Read the analytics for the production build of the project between two dates, with a given granularity. The granularity can be 'hourly' or 'daily'. The start and end dates must be in the format YYYY-MM-DD.\nThe start and end dates should be in RFC3339 format or date only format (YYYY-MM-DD).\n\nWhen to use this tool:\n- When the user is asking for usage of their app\n- When users want to improve their productions apps",
    "parameters": {
      "properties": {
        "enddate": {
          "type": "string"
        },
        "granularity": {
          "type": "string"
        },
        "startdate": {
          "type": "string"
        }
      },
      "required": ["startdate", "enddate", "granularity"],
      "type": "object"
    }
  },
  "stripe--enable_stripe": {
    "description": "Enable the Stripe integration on the current project. Calling this tool will prompt the user for their Stripe secret key.",
    "parameters": {
      "properties": {},
      "required": [],
      "type": "object"
    }
  },
  "security--run_security_scan": {
    "description": "Perform comprehensive security analysis of the Supabase backend to detect exposed data, missing RLS policies, and security misconfigurations",
    "parameters": {
      "properties": {},
      "required": [],
      "type": "object"
    }
  },
  "security--get_security_scan_results": {
    "description": "Fetch security information about the project that the user has access to. Set force=true to get results even if a scan is running.",
    "parameters": {
      "properties": {
        "force": {
          "type": "boolean"
        }
      },
      "required": ["force"],
      "type": "object"
    }
  },
  "security--get_table_schema": {
    "description": "Get the database table schema information and security analysis prompt for the project's Supabase database",
    "parameters": {
      "properties": {},
      "required": [],
      "type": "object"
    }
  }
}
​```
```

