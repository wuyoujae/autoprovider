const pool = require("../../../db");
const updateDialogueRecord = require("../../systemAgentLoop/utils/updateDialogueRecord");
const { v4: uuidv4 } = require("uuid");
const recordErrorLog = require("../../recordErrorLog");

/**
 * 处理会话终止时的逻辑
 * 保证最后一条消息是assistant消息
 * @param {string} workId
 */
const handleTerminateLogic = async (workId) => {
  if (!workId) return;

  const connection = await pool.getConnection();
  try {
    await connection.query("use autoprovider_open");
    // 获取最后一条消息和当前的dialogue_index
    const checkLastMessageSql = `SELECT role_type, dialogue_index
      FROM dialogue_record
      WHERE work_id = ? AND dialogue_status = 0
      ORDER BY dialogue_index DESC
      LIMIT 1`;

    const [rows] = await connection.query(checkLastMessageSql, [workId]);

    if (rows.length === 0) {
      return;
    }

    const lastMessage = rows[0];
    const nextIndex = lastMessage.dialogue_index + 1;

    // 如果最后一条消息是user或tool，则添加一条assistant消息
    if (lastMessage.role_type === "user" || lastMessage.role_type === "tool") {
      await updateDialogueRecord({
        dialogueId: uuidv4(),
        role: "assistant",
        content: "用户暂停任务，请等待用户指示",
        dialogue_index: nextIndex,
        dialogue_sender: "system",
        work_id: workId,
      });
    }
  } catch (error) {
    recordErrorLog(error, "handleTerminateLogic");
  } finally {
    connection.release();
  }
};

module.exports = handleTerminateLogic;
