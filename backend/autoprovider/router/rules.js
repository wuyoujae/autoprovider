const router = require("express").Router();
const rules = require("../router_handler/rules");
const auth = require("../middleware/auth");

router.post("/createrules", auth.parseToken, rules.createrules);
router.post("/saverules", auth.parseToken, rules.saverules);
router.post("/getrules", auth.parseToken, rules.getrules);
router.post("/deleterules", auth.parseToken, rules.deleterules);

module.exports = router;


