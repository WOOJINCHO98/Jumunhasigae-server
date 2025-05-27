const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");
const authenticateToken = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/adminAuthMiddleware");

// 유저 등록 API
router.post("/register", usersController.registerUser);

// 유저 삭제 API
router.delete(
  "/:userId",
  authenticateToken,
  isAdmin,
  usersController.deleteUser
);

router.get(
  "/profile",
  authenticateToken,
  isAdmin,
  usersController.getUserProfile
);

router.get(
  "/profile/:adminId/:userId",
  authenticateToken,
  isAdmin,
  usersController.getUserProfileById
);

router.put(
  "/profile",
  authenticateToken,
  isAdmin,
  usersController.updateUserProfile
);

router.post(
  "/verify-credentials",
  authenticateToken,
  isAdmin,
  usersController.verifyUserCredentials
);

router.get(
  "/child-user",
  authenticateToken,
  isAdmin,
  usersController.getChildUsers
);

module.exports = router;
