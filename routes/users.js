const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");

// 유저 등록 API
router.post("/register", usersController.registerUser);

module.exports = router;
