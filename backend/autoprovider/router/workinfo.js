const router = require("express").Router();
const workinfo = require("../router_handler/workinfo");
const auth = require("../middleware/auth");

router.post(
  "/getprojectfiletree",
  auth.parseToken,
  workinfo.getprojectfiletree
);

router.post(
  "/getprojectdbstructure",
  auth.parseToken,
  workinfo.getprojectdbstructure
);

router.post("/gettabledata", auth.parseToken, workinfo.gettabledata);

router.post("/getfilecontent", auth.parseToken, workinfo.getfilecontent);

router.post("/gettokenusage", auth.parseToken, workinfo.gettokenusage);

router.get("/getenv", auth.parseToken, workinfo.getenv);

router.post("/saveenv", auth.parseToken, workinfo.saveenv);

module.exports = router;
