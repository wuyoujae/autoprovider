const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");

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

const mapStatus = (status) => (status === 1 ? "completed" : "pending");

async function doneTodo(payload = {}, infoObject = {}) {
  // 优先使用外部传入连接，未提供则自建并在 finally 释放
  let connection = infoObject.connection;
  let shouldReleaseConnection = false;
  if (!connection) {
    connection = await pool.getConnection();
    shouldReleaseConnection = true;
  }
  try {
    // 从 infoObject 中获取 session_id
    const session_id = infoObject?.sessionId;

    // 参数验证
    if (!session_id || typeof session_id !== "string") {
      recordErrorLog("sessionId不能为空", "AgentFunction in done todo");
      return {
        status: 1,
        message: "donetodo fail",
        data: {
          error: "系统出错，请停止工作",
        },
      };
    }

    // 从 payload 中获取参数
    const todolist_name = payload?.todolist_name;
    const todos = payload?.todos;

    if (!todolist_name || typeof todolist_name !== "string") {
      return {
        status: 1,
        message: "donetodo fail",
        data: {
          error: "待办列表名称不能为空，请检查你的参数是否正确然后再重新调用",
        },
      };
    }

    if (!Array.isArray(todos) || todos.length === 0) {
      return {
        status: 1,
        message: "donetodo fail",
        data: {
          error:
            "待办项列表不能为空，必须是数组,请检查你的参数是否正确然后再重新调用",
        },
      };
    }

    // 提取待办项标题
    const todoTitles = [];
    for (let i = 0; i < todos.length; i++) {
      const todo = todos[i];
      const title = typeof todo === "string" ? todo : todo?.title;

      if (!title || typeof title !== "string") {
        return {
          status: 1,
          message: "donetodo fail",
          data: {
            error: `第${
              i + 1
            }个待办项的标题不能为空，请检查你的参数是否正确然后再重新调用`,
          },
        };
      }

      todoTitles.push(title);
    }

    // 1. 通过 todolist_name 和 session_id 查找 todolist_id
    const findTodoListSql = `SELECT todolist_id, todolist_status 
      FROM todolist 
      WHERE session_id = ? AND todolist_name = ? AND todolist_status = 0`;

    const [todoListRows] = await connection.query(findTodoListSql, [
      session_id,
      todolist_name,
    ]);

    if (todoListRows.length === 0) {
      return {
        status: 1,
        message: "donetodo fail",
        data: {
          error: `找不到待办列表: ${todolist_name}，请调用获取当前会话的todolist方法查询当前代办内容`,
        },
      };
    }

    const todolist_id = todoListRows[0].todolist_id;

    // 2. 查找并更新指定的待办项
    const operationResults = [];
    let successfulOperations = 0;
    let failedOperations = 0;
    let newlyCompleted = 0;
    let alreadyCompleted = 0;

    const getTodoStatsSql = `SELECT 
        COUNT(*) AS total_items,
        SUM(CASE WHEN todo_status = 1 THEN 1 ELSE 0 END) AS completed_items
      FROM todo
      WHERE todolist_id = ?`;

    const [beforeStatsRows] = await connection.query(getTodoStatsSql, [
      todolist_id,
    ]);
    const totalItemsBefore = beforeStatsRows[0]?.total_items || 0;
    const completedBefore = beforeStatsRows[0]?.completed_items || 0;

    for (const todoTitle of todoTitles) {
      // 查找待办项
      const findTodoSql = `SELECT todo_id, todo_title, todo_status, create_time 
        FROM todo 
        WHERE todolist_id = ? AND todo_title = ?
        LIMIT 1`;

      const [todoRows] = await connection.query(findTodoSql, [
        todolist_id,
        todoTitle,
      ]);

      if (todoRows.length === 0) {
        operationResults.push({
          title: todoTitle,
          item_id: null,
          result: "标记结果：mark fail【待办项不存在】",
          previous_status: "not_found",
          current_status: "not_found",
          completion_time: null,
        });
        failedOperations += 1;
        continue;
      }

      const todo = todoRows[0];
      let resultMessage = "";
      let currentStatus = mapStatus(todo.todo_status);
      const previousStatus = currentStatus;
      let completionTime = null;

      if (todo.todo_status === 0) {
        const updateTodoSql = `UPDATE todo 
          SET todo_status = 1 
          WHERE todo_id = ?`;
        await connection.query(updateTodoSql, [todo.todo_id]);
        currentStatus = "completed";
        resultMessage = "标记结果：mark success【已成功标记为完成】";
        completionTime = formatTimestamp();
        successfulOperations += 1;
        newlyCompleted += 1;
      } else {
        resultMessage = "标记结果：mark success【项目已是完成状态】";
        completionTime = formatTimestamp(todo.create_time);
        successfulOperations += 1;
        alreadyCompleted += 1;
      }

      operationResults.push({
        title: todoTitle,
        item_id: todo.todo_id,
        result: resultMessage,
        previous_status: previousStatus,
        current_status: currentStatus,
        completion_time: completionTime,
      });
    }

    const [afterStatsRows] = await connection.query(getTodoStatsSql, [
      todolist_id,
    ]);
    const totalItemsAfter = afterStatsRows[0]?.total_items || 0;
    const completedAfter = afterStatsRows[0]?.completed_items || 0;
    const pendingAfter = totalItemsAfter - completedAfter;
    const allCompleted = totalItemsAfter > 0 && pendingAfter === 0;

    // 4. 如果所有todo都完成了，更新todolist状态为全部完成
    if (allCompleted) {
      const updateTodoListSql = `UPDATE todolist 
        SET todolist_status = 1 
        WHERE todolist_id = ? AND todolist_status = 0`;

      await connection.query(updateTodoListSql, [todolist_id]);
    }

    // 通知前端，返回更新后的状态的todolist内容
    // const todoItems = normalizedTodos.map((todo) => ({
    //   title: todo.todoTitle,
    //   isDone: false, // 刚创建的 todo 都是未完成状态
    // }));

    // // 将数组转换为 JSON 字符串
    // const todoListJson = JSON.stringify(todoItems);

    // chatToFrontend(todoListJson, "createtodolist", infoObject);
    // 按照上面的格式
    const getUpdatedTodoSql = `SELECT todo_id, todo_title, todo_status 
      FROM todo 
      WHERE todolist_id = ?`;
    const [updatedTodoRows] = await connection.query(getUpdatedTodoSql, [
      todolist_id,
    ]);
    const todoItems = updatedTodoRows.map((todo) => ({
      title: todo.todo_title,
      isDone: todo.todo_status === 1 ? true : false,
    }));
    const todoListJson = JSON.stringify(todoItems);
    // 先试用createtodolist，后续更新后换,TODO：待更新
    chatToFrontend(todoListJson, "create_todolist", infoObject);

    const completionRate =
      totalItemsAfter === 0
        ? "0%"
        : `${((completedAfter / totalItemsAfter) * 100).toFixed(1)}%`;

    const responseData = {
      todolist_info: {
        todolist_name,
        todolist_id,
        result: "操作结果：execute success",
        total_items: totalItemsAfter,
        completed_before: completedBefore,
        completed_after: completedAfter,
        pending_after: pendingAfter,
        completion_rate: completionRate,
      },
      operation_results: operationResults,
      summary: {
        total_operations: operationResults.length,
        successful_operations: successfulOperations,
        failed_operations: failedOperations,
        newly_completed: newlyCompleted,
        already_completed: alreadyCompleted,
      },
    };

    let status = 0;
    let message = "donetodo success";
    if (successfulOperations === 0 && failedOperations > 0) {
      status = 1;
      message = "所有待办项标记失败";
      responseData.todolist_info.result = "操作结果：execute fail";
    } else if (failedOperations > 0) {
      status = 1;
      message = "部分待办项标记失败";
      responseData.todolist_info.result = "操作结果：execute partial";
    }

    return {
      status,
      message,
      data: responseData,
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in done todo");
    return {
      status: 1,
      message: "donetodo fail",
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

module.exports = doneTodo;
