const express = require("express");
const router = express.Router();

const {
  getContent,
  getGuests
} = require("../controller/contentController");

router.get("/", getContent);
router.get("/guests", getGuests);

module.exports = router;
