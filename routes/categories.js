const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categoriesController");
const authenticateToken = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/adminAuthMiddleware"); // isAdmin 미들웨어 불러오기

// 전체 카테고리 목록 조회 (자신의 카테고리 또는 권한 있는 관리자의 카테고리)
router.get("/", authenticateToken, categoriesController.getAllCategories);

// 특정 카테고리 상세 정보 조회 (자신의 카테고리 또는 권한 있는 관리자의 카테고리)
router.get(
  "/:categoryId",
  authenticateToken,
  categoriesController.getCategoryById
);

// 새 카테고리 추가 (인증 필요, 관리자 권한 필요)
router.post("/", authenticateToken, isAdmin, categoriesController.addCategory);

// 특정 카테고리 정보 수정 (인증 필요, 관리자 권한 필요)
router.put(
  "/:categoryId",
  authenticateToken,
  isAdmin,
  categoriesController.updateCategory
);

// 특정 카테고리 삭제 (인증 필요, 관리자 권한 필요)
router.delete(
  "/:categoryId",
  authenticateToken,
  isAdmin,
  categoriesController.deleteCategory
);

module.exports = router;
