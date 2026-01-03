const router = require("express").Router();
const projectinfo = require("../router_handler/projectinfo");
const auth = require("../middleware/auth");

router.get(
  "/getuserprojectlist",
  auth.parseToken,
  projectinfo.getuserprojectlist
);

router.post("/createproject", auth.parseToken, projectinfo.createproject);

router.post("/deleteproject", auth.parseToken, projectinfo.deleteproject);

router.post("/getprojecturl", auth.parseToken, projectinfo.getProjectUrl);

module.exports = router;
