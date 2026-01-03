const router = require("express").Router();
const changelog = require("../router_handler/changelog");

// 获取 changelog 列表（不含 content_html）
router.get("/getList", changelog.getList);

// 获取 changelog 详情（含 content_html）
router.get("/getDetail", changelog.getDetail);

module.exports = router;

