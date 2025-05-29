const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authenticateToken = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/adminAuthMiddleware");

// 특정 유저에게 접근 권한 부여
router.post(
  "/grant-access",
  authenticateToken,
  isAdmin,
  adminController.grantAccess
);

// 특정 유저에게 접근 권한 취소
router.delete(
  "/revoke-access",
  authenticateToken,
  isAdmin,
  adminController.revokeAccess
);

// 관리자 주문 취소 요청 승인
router.delete(
  "/orders/:orderId/cancel",
  authenticateToken,
  isAdmin,
  adminController.adminCancelOrder
);

module.exports = router;
