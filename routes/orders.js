const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");
const authenticateToken = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/adminAuthMiddleware");

// 주문 조회
router.get("/", authenticateToken, ordersController.getAllOrders);

// 특정 주문 상세 정보 조회 (특정 유저)
router.get("/:orderId", authenticateToken, ordersController.getOrderDetail);

// 새 주문 추가 (특정 유저)
router.post("/", authenticateToken, ordersController.addOrder);

// 특정 주문 상태 수정 (특정 유저)
router.put(
  "/:orderId",
  authenticateToken,
  isAdmin,
  ordersController.updateOrderStatus
);

// 주문 취소 요청 (일반 사용자)
router.post(
  "/:orderId/cancel-request",
  authenticateToken,
  ordersController.requestOrderCancellation
);

// 특정 주문 삭제 (특정 유저)
router.delete("/:orderId", authenticateToken, ordersController.deleteOrder);

module.exports = router;
