const router = require("express").Router();
const userinfo = require("../router_handler/userinfo");
const auth = require("../middleware/auth");

router.post("/login", userinfo.login);

router.get("/getuserinfo", auth.parseToken, userinfo.getuserinfo);

router.post("/getusertokenhistory", auth.parseToken, userinfo.getusertokenhistory);

module.exports = router;
