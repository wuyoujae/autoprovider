const db = require("../db/index");
const recordErrorLog = require("../utils/recordErrorLog");

/**
 * 获取最新有效的广告内容
 * 仅返回 adv_status = 0 的最新一条
 */
const getLatestAdv = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query("use autoprovider_open");

    const [rows] = await connection.query(
      `SELECT adv_id, adv_title, adv_src, adv_version, adv_status, create_time, update_time
       FROM adv_content
       WHERE adv_status = 0
       ORDER BY update_time DESC, create_time DESC
       LIMIT 1`
    );

    const adv = rows?.[0];
    if (!adv) {
      return res.send({
        status: 0,
        message: "暂无可用广告",
        data: null,
      });
    }

    return res.send({
      status: 0,
      message: "获取广告成功",
      data: {
        adv_id: adv.adv_id,
        adv_title: adv.adv_title,
        adv_src: adv.adv_src,
        adv_version: adv.adv_version,
        adv_status: adv.adv_status,
        create_time: adv.create_time,
        update_time: adv.update_time,
      },
    });
  } catch (error) {
    recordErrorLog(error, "getLatestAdv");
    return res.send({
      status: 1,
      message: error?.message || "获取广告失败",
      data: "fail",
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getLatestAdv,
};
