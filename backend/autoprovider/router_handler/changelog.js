const db = require("../db/index");
const recordErrorLog = require("../utils/recordErrorLog");

/**
 * 获取 changelog 列表（不含 content_html）
 * 默认仅返回 status=0 的发布记录，按 release_date desc, create_time desc 排序
 */
const getList = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query("use autoprovider_open");

    const [rows] = await connection.query(
      `SELECT changelog_id, version, title, summary, tags, release_date, status, create_time, update_time
       FROM changelog
       WHERE status = 0
       ORDER BY release_date DESC, create_time DESC`
    );

    return res.send({
      status: 0,
      message: "获取 changelog 列表成功",
      data: rows || [],
    });
  } catch (error) {
    recordErrorLog(error, "getChangelogList");
    return res.send({
      status: 1,
      message: error?.message || "获取 changelog 列表失败",
      data: "fail",
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * 获取 changelog 详情（含 content_html）
 */
const getDetail = async (req, res) => {
  let connection;
  try {
    const { id } = req.query || {};
    if (!id || typeof id !== "string") {
      return res.send({
        status: 1,
        message: "changelog_id 不能为空",
        data: "fail",
      });
    }

    connection = await db.getConnection();
    await connection.query("use autoprovider_open");

    const [rows] = await connection.query(
      `SELECT changelog_id, version, title, summary, content_html, tags, release_date, status, create_time, update_time
       FROM changelog
       WHERE changelog_id = ? AND status = 0
       LIMIT 1`,
      [id]
    );

    const item = rows?.[0];
    if (!item) {
      return res.send({
        status: 1,
        message: "未找到对应 changelog",
        data: "fail",
      });
    }

    return res.send({
      status: 0,
      message: "获取 changelog 详情成功",
      data: item,
    });
  } catch (error) {
    recordErrorLog(error, "getChangelogDetail");
    return res.send({
      status: 1,
      message: error?.message || "获取 changelog 详情失败",
      data: "fail",
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getList,
  getDetail,
};
