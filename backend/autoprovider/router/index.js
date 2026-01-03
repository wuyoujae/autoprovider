const router = require("express").Router();

const userinfoRouter = require("./userinfo");
const uservecRouter = require("./uservec");
const projectinfoRouter = require("./projectinfo");
const sessionRouter = require("./session");
const workinfoRouter = require("./workinfo");
const rulesRouter = require("./rules");
const systeminfoRouter = require("./systeminfo");
const changelogRouter = require("./changelog");
const llmconfigRouter = require("./llmconfig");

router.use("/userinfo", userinfoRouter);
router.use("/uservec", uservecRouter);
router.use("/projectinfo", projectinfoRouter);
router.use("/session", sessionRouter);
router.use("/workinfo", workinfoRouter);
router.use("/rules", rulesRouter);
router.use("/systeminfo", systeminfoRouter);
router.use("/changelog", changelogRouter);
router.use("/llmconfig", llmconfigRouter);

module.exports = router;
