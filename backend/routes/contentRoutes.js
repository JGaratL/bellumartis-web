const express = require("express");
const router = express.Router();

const {
  getContent,
  getContentById,
  getGuests,
  getContentFilters,
} = require("../controller/contentController");

router.get("/", getContent);
router.get("/filters", getContentFilters);
router.get("/guests", getGuests);
router.get("/:id", getContentById);

module.exports = router;
