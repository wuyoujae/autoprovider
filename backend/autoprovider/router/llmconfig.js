const express = require("express");
const router = express.Router();
const {
  getconfig,
  saveconfig,
} = require("../router_handler/llmconfig");

router.get("/get", getconfig);
router.post("/get", getconfig); // 兼容旧前端请求方式
router.post("/save", saveconfig);

module.exports = router;

