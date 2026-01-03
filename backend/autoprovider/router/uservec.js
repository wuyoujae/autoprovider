const router = require("express").Router();
const uservec = require("../router_handler/uservec");

// 注册
router.post("/register", uservec.register);

module.exports = router;
