const router = require("express").Router();
const systeminfo = require("../router_handler/systeminfo");

// 获取最新有效广告
router.get("/latestadv", systeminfo.getLatestAdv);

module.exports = router;
