const recordErrorLog = require("../recordErrorLog");
const { v4: uuidv4 } = require("uuid");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");
const pool = require("../../db");

/**
 * 创建待办列表
 * @param {Object} payload - 函数参数对象
 * @param {string} payload.todolist_name - 待办列表名称
 * @param {Array<{title: string}>} payload.todos - 待办项数组
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
const formatTimestamp = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (num) => num.toString().padStart(2, "0");
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
};

async function createTodolist(payload = {}, infoObject = {}) {
  // 优先使用外部传入连接，未提供则自建并在 finally 释放
  let connection = infoObject.connection;
  let shouldReleaseConnection = false;
  if (!connection) {
    connection = await pool.getConnection();
    shouldReleaseConnection = true;
  }
  try {
    // 从 payload 中获取参数
    const todolist_name = payload?.todolist_name;
    const todos = payload?.todos;

    if (!todolist_name || typeof todolist_name !== "string") {
      return {
        status: 1,
        message: "createtodolist fail",
        data: {
          error: "待办列表名称不能为空，请检查你的参数是否正确然后再重新调用",
          received_todolist_name: todolist_name,
          type: typeof todolist_name,
        },
      };
    }

    if (!Array.isArray(todos) || todos.length === 0) {
      return {
        status: 1,
        message: "createtodolist fail",
        data: {
          error:
            "待办项列表不能为空，必须是数组,请检查你的参数是否正确然后再重新调用",
        },
      };
    }

    // 验证每个todo是否有title
    const normalizedTodos = [];
    for (let i = 0; i < todos.length; i++) {
      const todo = todos[i];

      // 支持多种格式：todo.title
      let todoTitle;
      if (typeof todo === "string") {
        todoTitle = todo;
      } else if (todo && typeof todo === "object") {
        todoTitle = todo.title;
      }

      if (!todoTitle || typeof todoTitle !== "string") {
        return {
          status: 1,
          message: "createtodolist fail",
          data: {
            error: `第${
              i + 1
            }个待办项的标题不能为空，请检查你的参数是否正确然后再重新调用`,
          },
        };
      }

      normalizedTodos.push({ todoTitle });
    }

    // 构造符合前端组件格式的数据：[{title: "...", isDone: false}, ...]
    const todoItems = normalizedTodos.map((todo) => ({
      title: todo.todoTitle,
      isDone: false, // 刚创建的 todo 都是未完成状态
    }));

    // 将数组转换为 JSON 字符串
    const todoListJson = JSON.stringify(todoItems);

    chatToFrontend(todoListJson, "create_todolist", infoObject);

    // 1. 检查session_id是否存在且状态正常
    const checkSessionSql = `SELECT session_id, session_status 
      FROM session_record 
      WHERE session_id = ? AND session_status = 0`;

    const [sessionRows] = await connection.query(checkSessionSql, [
      infoObject.sessionId,
    ]);

    if (sessionRows.length === 0) {
      return {
        status: 1,
        message: "createtodolist fail",
        data: {
          error: "系统问题出错，请暂停工作",
        },
      };
    }

    // 2. 检查该session_id是否已存在未完成的todolist
    const checkTodoListSql = `SELECT todolist_id 
      FROM todolist 
      WHERE session_id = ? AND todolist_status = 0`;

    const [todoListRows] = await connection.query(checkTodoListSql, [
      infoObject.sessionId,
    ]);

    if (todoListRows.length > 0) {
      return {
        status: 1,
        message: "createtodolist fail",
        data: {
          error:
            "该会话已存在未完成的待办列表，无法创建新的待办列表，请你跳过这个步骤，调用获取todolist的方法查看当前正在进行的代办",
        },
      };
    }

    // 3. 创建todolist
    const todolist_id = uuidv4();
    const insertTodoListSql = `INSERT INTO todolist 
      (todolist_id, session_id, todolist_name, todolist_status, create_time) 
      VALUES (?, ?, ?, ?, NOW())`;

    await connection.query(insertTodoListSql, [
      todolist_id,
      infoObject.sessionId,
      todolist_name,
      0, // todolist_status: 0-进行中
    ]);

    // 4. 批量插入todo项
    const insertTodoSql = `INSERT INTO todo 
      (todo_id, todolist_id, todo_title, todo_desc, todo_status, create_time) 
      VALUES (?, ?, ?, ?, ?, NOW())`;

    const todoIds = [];
    const todoItemResults = [];
    let itemsAdded = 0;
    for (const todo of normalizedTodos) {
      const todo_id = uuidv4();
      todoIds.push(todo_id);
      await connection.query(insertTodoSql, [
        todo_id,
        todolist_id,
        todo.todoTitle,
        null, // todo_desc 默认为空
        0, // todo_status: 0-未完成
      ]);
      itemsAdded += 1;
      todoItemResults.push({
        item_id: todo_id,
        title: todo.todoTitle,
        status: "pending",
        result: "添加结果：add success",
        created_time: formatTimestamp(),
      });
    }

    const [todolistRows] = await connection.query(
      "SELECT create_time FROM todolist WHERE todolist_id = ? LIMIT 1",
      [todolist_id]
    );

    const creationTime = formatTimestamp(
      todolistRows?.[0]?.create_time || new Date()
    );

    const totalItems = normalizedTodos.length;
    const completedItems = 0;
    const pendingItems = totalItems - completedItems;

    const responseData = {
      todolist_info: {
        todolist_name,
        todolist_id,
        creation_time: creationTime,
        result: "创建结果：create success",
        total_items: totalItems,
        completed_items: completedItems,
        pending_items: pendingItems,
      },
      todo_items: todoItemResults,
      summary: {
        todolist_created: true,
        items_added: itemsAdded,
        items_failed: totalItems - itemsAdded,
        completion_rate:
          totalItems === 0
            ? "0%"
            : `${Math.round((completedItems / totalItems) * 100)}%`,
      },
    };

    return {
      status: 0,
      message: "createtodolist success",
      data: responseData,
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in create todo list");
    return {
      status: 1,
      message: "createtodolist fail",
      data: {
        error: "系统问题出错，请暂停工作",
      },
    };
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
}

module.exports = createTodolist;
