const express = require("express");
const router = express.Router();
const menusController = require("../controllers/menusController");
const authenticateToken = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/adminAuthMiddleware");
const multer = require("multer");
const path = require("path");

// 전체 메뉴 목록 조회 (인증 적용 - 선택 사항)
router.get("/", authenticateToken, menusController.getAllMenus);

// 키워드 기반 메뉴 검색 (인증 적용 - 선택 사항)
router.get("/search", authenticateToken, menusController.searchMenus);

// 특정 메뉴 상세 정보 조회 (인증 적용 - 선택 사항)
router.get("/menu/:menuId", authenticateToken, menusController.getMenuById);

// 특정 카테고리 메뉴 조회 (인증 적용 - 선택 사항)
router.get(
  "/category/:categoryId",
  authenticateToken,
  menusController.getMenusByCategory
);

// 새 메뉴 추가 (인증 필수)
router.post("/", authenticateToken, isAdmin, menusController.addMenu);

// 특정 메뉴 정보 수정 (인증 필수)
router.put("/:menuId", authenticateToken, isAdmin, menusController.updateMenu);

// 특정 메뉴 삭제 (인증 필수)
router.delete(
  "/:menuId",
  authenticateToken,
  isAdmin,
  menusController.deleteMenu
);

// 이미지 저장을 위한 multer 설정 (메뉴 ID 없이 업로드용)
const uploadWithoutMenuIdStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/temp")); // 임시 저장 폴더
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext); // 파일명 설정
  },
});

const uploadWithoutMenuId = multer({ storage: uploadWithoutMenuIdStorage });

// 메뉴 ID 없이 이미지 업로드 (인증 필수)
router.post(
  "/upload/image",
  authenticateToken,
  isAdmin,
  uploadWithoutMenuId.single("image"),
  menusController.uploadImageWithoutMenuId
);

// 이미지 저장을 위한 multer 설정 (특정 메뉴 ID와 함께 업로드용 - 기존 설정 유지)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/menus")); // 저장 경로 설정
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext); // 파일명 설정
  },
});

const upload = multer({ storage: storage });

// 특정 메뉴 이미지 업로드 (관리자 권한 필요)
router.post(
  "/:menuId/image",
  authenticateToken,
  isAdmin,
  upload.single("image"),
  menusController.uploadMenuImage
);

// 특정 메뉴 이미지 삭제 (관리자 권한 필요)
router.delete(
  "/:menuId/image",
  authenticateToken,
  isAdmin,
  menusController.deleteMenuImage
);

module.exports = router;
