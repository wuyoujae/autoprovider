const router = require("express").Router();
const session = require("../router_handler/session");
const auth = require("../middleware/auth");

router.post("/createSession", auth.parseToken, session.createSession);
router.post("/agentChat", auth.parseToken, session.agentChat);
router.post("/getSessionList", auth.parseToken, session.getSessionList);
router.post(
  "/getSessionOperations",
  auth.parseToken,
  session.getSessionOperations
);
router.post("/reconnectSession", auth.parseToken, session.reconnectSession);
router.post("/terminateSession", auth.parseToken, session.terminateSession);

module.exports = router;
