const sqlite3 = require("sqlite3").verbose();
const db = require("../database");
const path = require("path");
const fs = require("fs").promises;

// 전체 메뉴 목록 조회 (자신의 메뉴 또는 권한 있는 관리자의 메뉴)
exports.getAllMenus = (req, res) => {
  const currentUserId = req.user.userId;
  const sql = `
    SELECT m.*, c.name AS category_name
    FROM menus m
    LEFT JOIN categories c ON m.category_id = c.id
    LEFT JOIN user_admin_relationships uar ON m.user_id = uar.admin_id AND uar.user_id = ?
    WHERE m.user_id = ? OR uar.admin_id IS NOT NULL
  `;
  db.all(sql, [currentUserId, currentUserId], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ message: "메뉴 목록을 가져오는데 실패했습니다." });
    } else {
      res.json(rows);
    }
  });
};

// 특정 메뉴 상세 정보 조회 (자신의 메뉴 또는 권한 있는 관리자의 메뉴)
exports.getMenuById = (req, res) => {
  const menuId = parseInt(req.params.menuId);
  const currentUserId = req.user.userId;
  const sql = `
    SELECT m.*, c.name AS category_name
    FROM menus m
    LEFT JOIN categories c ON m.category_id = c.id
    LEFT JOIN user_admin_relationships uar ON m.user_id = uar.admin_id AND uar.user_id = ?
    WHERE m.id = ? AND (m.user_id = ? OR uar.admin_id IS NOT NULL)
  `;
  db.get(sql, [currentUserId, menuId, currentUserId], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ message: "메뉴 정보를 가져오는데 실패했습니다." });
    } else if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: "메뉴를 찾을 수 없습니다." });
    }
  });
};

// 특정 카테고리 메뉴 조회 (자신의 메뉴 또는 권한 있는 관리자의 메뉴)
exports.getMenusByCategory = (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const currentUserId = req.user.userId;
  const sql = `
    SELECT m.*
    FROM menus m
    LEFT JOIN user_admin_relationships uar ON m.user_id = uar.admin_id AND uar.user_id = ?
    WHERE m.category_id = ? AND (m.user_id = ? OR uar.admin_id IS NOT NULL)
  `;
  db.all(sql, [currentUserId, categoryId, currentUserId], (err, rows) => {
    if (err) {
      console.error(err.message);
      res
        .status(500)
        .json({ message: "특정 카테고리 메뉴를 가져오는데 실패했습니다." });
    } else {
      res.json(rows);
    }
  });
};

// 키워드 기반 메뉴 검색 (자신의 메뉴 또는 권한 있는 관리자의 메뉴)
exports.searchMenus = (req, res) => {
  const searchTerm = req.query.search;
  const currentUserId = req.user.userId;
  if (!searchTerm) {
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }
  const sql = `
    SELECT m.*
    FROM menus m
    LEFT JOIN user_admin_relationships uar ON m.user_id = uar.admin_id AND uar.user_id = ?
    WHERE m.name LIKE ? AND (m.user_id = ? OR uar.admin_id IS NOT NULL)
  `;
  const params = [`%${searchTerm}%`, currentUserId];
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ message: "메뉴 검색에 실패했습니다." });
    } else {
      res.json(rows);
    }
  });
};

// 새 메뉴 추가 (인증된 유저 ID 사용)
exports.addMenu = (req, res) => {
  const { category_id, name, price, description, image_url } = req.body;
  const userId = req.user.userId;
  db.run(
    "INSERT INTO menus (user_id, category_id, name, price, description, image_url) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, category_id, name, price, description, image_url],
    function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).json({ message: "새 메뉴를 추가하는데 실패했습니다." });
      } else {
        db.get(
          "SELECT * FROM menus WHERE id = ? AND user_id = ?",
          [this.lastID, userId],
          (err, row) => {
            if (err) {
              console.error(err.message);
              res
                .status(500)
                .json({ message: "새 메뉴를 추가하는데 실패했습니다." });
            } else {
              res.status(201).json(row);
            }
          }
        );
      }
    }
  );
};

// 특정 메뉴 정보 수정 (인증된 유저의 메뉴만 수정)
exports.updateMenu = (req, res) => {
  const menuId = parseInt(req.params.menuId);
  const userId = req.user.userId;
  const { category_id, name, price, description, image_url } = req.body;
  db.run(
    "UPDATE menus SET category_id = ?, name = ?, price = ?, description = ?, image_url = ? WHERE id = ? AND user_id = ?",
    [category_id, name, price, description, image_url, menuId, userId],
    (err) => {
      if (err) {
        console.error(err.message);
        res
          .status(500)
          .json({ message: "메뉴 정보를 수정하는데 실패했습니다." });
      } else {
        db.get(
          "SELECT * FROM menus WHERE id = ? AND user_id = ?",
          [menuId, userId],
          (err, row) => {
            if (err) {
              console.error(err.message);
              res
                .status(500)
                .json({ message: "메뉴 정보를 수정하는데 실패했습니다." });
            } else if (row) {
              res.json(row);
            } else {
              res.status(404).json({ message: "메뉴를 찾을 수 없습니다." });
            }
          }
        );
      }
    }
  );
};

// 특정 메뉴 삭제 (인증된 유저의 메뉴만 삭제)
exports.deleteMenu = (req, res) => {
  const menuId = parseInt(req.params.menuId);
  const userId = req.user.userId;
  console.log(`Attempting to delete menu ID: ${menuId} for user ID: ${userId}`);
  db.run(
    "DELETE FROM menus WHERE id = ? AND user_id = ?",
    [menuId, userId],
    function (err) {
      // 일반 함수 표현식 유지
      console.log(`Error: ${err}`);
      console.log(
        `Changes: ${this ? this.changes : "this is null or undefined"}`
      ); // 이전 this 로깅 유지

      const stmt = this; // 콜백 함수 내에서 this를 stmt 변수에 할당

      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ message: "메뉴를 삭제하는데 실패했습니다." });
      } else {
        if (stmt && stmt.changes > 0) {
          // stmt 객체와 changes 속성 사용
          return res.status(204).send(); // No Content
        } else {
          return res.status(404).json({ message: "메뉴를 찾을 수 없습니다." });
        }
      }
    }
  );
};

exports.uploadImageWithoutMenuId = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "이미지 파일이 업로드되지 않았습니다." });
  }

  const imageUrl = `/uploads/temp/${req.file.filename}`; // 임시 저장 경로

  res.json({ imageUrl }); // 업로드된 이미지 URL을 응답으로 보냄
};

exports.uploadMenuImage = async (req, res) => {
  const menuId = parseInt(req.params.menuId);
  const userId = req.user.userId;

  if (!req.file) {
    return res
      .status(400)
      .json({ message: "이미지 파일이 업로드되지 않았습니다." });
  }

  const imageUrl = `/uploads/menus/${req.file.filename}`; // 저장된 이미지 경로

  try {
    // 해당 메뉴가 현재 관리자의 메뉴인지 확인
    const menu = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, user_id FROM menus WHERE id = ?",
        [menuId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!menu) {
      return res.status(404).json({ message: "메뉴를 찾을 수 없습니다." });
    }

    if (menu.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "해당 메뉴를 수정할 권한이 없습니다." });
    }

    // 이미지 URL 업데이트
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE menus SET image_url = ? WHERE id = ?",
        [imageUrl, menuId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });

    const updatedMenu = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM menus WHERE id = ?", [menuId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (updatedMenu) {
      res.json(updatedMenu);
    } else {
      res.status(500).json({ message: "이미지 URL 업데이트에 실패했습니다." });
    }
  } catch (error) {
    console.error("메뉴 이미지 업로드 오류:", error);
    res.status(500).json({ message: "메뉴 이미지 업로드에 실패했습니다." });
  }
};

exports.deleteMenuImage = async (req, res) => {
  const menuId = parseInt(req.params.menuId);
  const userId = req.user.userId;

  try {
    // 해당 메뉴가 현재 관리자의 메뉴인지 및 기존 이미지 URL 확인
    const menu = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, user_id, image_url FROM menus WHERE id = ?",
        [menuId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!menu) {
      return res.status(404).json({ message: "메뉴를 찾을 수 없습니다." });
    }

    if (menu.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "해당 메뉴를 수정할 권한이 없습니다." });
    }

    const oldImageUrl = menu.image_url;

    // 이미지 URL을 NULL로 업데이트
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE menus SET image_url = NULL WHERE id = ?",
        [menuId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });

    // 서버에서 이미지 파일 삭제 (선택 사항)
    if (oldImageUrl) {
      const imagePath = path.join(
        __dirname,
        "../uploads",
        oldImageUrl.replace("/uploads/", "")
      );
      try {
        await fs.unlink(imagePath);
        console.log(`이미지 파일 삭제 성공: ${imagePath}`);
      } catch (error) {
        console.error(`이미지 파일 삭제 실패: ${error}`);
      }
    }

    res.json({ message: "이미지가 삭제되었습니다." });
  } catch (error) {
    console.error("메뉴 이미지 삭제 오류:", error);
    res.status(500).json({ message: "메뉴 이미지 삭제에 실패했습니다." });
  }
};
