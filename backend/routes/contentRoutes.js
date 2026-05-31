const express = require("express");
const router = express.Router();

const {
  getContent,
} = require("../controller/contentController");

router.get("/", getContent);

module.exports = router;
