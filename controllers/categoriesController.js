const sqlite3 = require("sqlite3").verbose();
const db = require("../database");

// 전체 카테고리 목록 조회 (자신의 카테고리 또는 권한 있는 관리자의 카테고리)
exports.getAllCategories = (req, res) => {
  const currentUserId = req.user.userId;
  const sql = `
    SELECT c.*
    FROM categories c
    LEFT JOIN user_admin_relationships uar ON c.user_id = uar.admin_id AND uar.user_id = ?
    WHERE c.user_id = ? OR uar.admin_id IS NOT NULL
  `;
  db.all(sql, [currentUserId, currentUserId], (err, rows) => {
    if (err) {
      console.error(err.message);
      res
        .status(500)
        .json({ message: "카테고리 목록을 가져오는데 실패했습니다." });
    } else {
      res.json(rows);
    }
  });
};

// 특정 카테고리 상세 정보 조회 (자신의 카테고리 또는 권한 있는 관리자의 카테고리)
exports.getCategoryById = (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const currentUserId = req.user.userId;
  const sql = `
      SELECT c.*
      FROM categories c
      LEFT JOIN user_admin_relationships uar ON c.user_id = uar.admin_id AND uar.user_id = ?
      WHERE c.id = ? AND (c.user_id = ? OR uar.admin_id IS NOT NULL)
    `;
  db.get(sql, [currentUserId, categoryId, currentUserId], (err, row) => {
    if (err) {
      console.error(err.message);
      res
        .status(500)
        .json({ message: "카테고리 정보를 가져오는데 실패했습니다." });
    } else if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: "카테고리를 찾을 수 없습니다." });
    }
  });
};

// 새 카테고리 추가 (특정 유저)
exports.addCategory = (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;
  db.run(
    "INSERT INTO categories (user_id, name) VALUES (?, ?)",
    [userId, name],
    function (err) {
      if (err) {
        console.error(err.message);
        res
          .status(500)
          .json({ message: "새 카테고리를 추가하는데 실패했습니다." });
      } else {
        db.get(
          "SELECT * FROM categories WHERE id = ? AND user_id = ?",
          [this.lastID, userId],
          (err, row) => {
            if (err) {
              console.error(err.message);
              res
                .status(500)
                .json({ message: "새 카테고리를 추가하는데 실패했습니다." });
            } else {
              res.status(201).json(row);
            }
          }
        );
      }
    }
  );
};

// 특정 카테고리 정보 수정 (특정 유저)
exports.updateCategory = (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const { name } = req.body;
  const userId = req.user.userId;
  db.run(
    "UPDATE categories SET name = ? WHERE id = ? AND user_id = ?",
    [name, categoryId, userId],
    (err) => {
      if (err) {
        console.error(err.message);
        res
          .status(500)
          .json({ message: "카테고리 정보를 수정하는데 실패했습니다." });
      } else {
        db.get(
          "SELECT * FROM categories WHERE id = ? AND user_id = ?",
          [categoryId, userId],
          (err, row) => {
            if (err) {
              console.error(err.message);
              res
                .status(500)
                .json({ message: "카테고리 정보를 수정하는데 실패했습니다." });
            } else if (row) {
              res.json(row);
            } else {
              res.status(404).json({ message: "카테고리를 찾을 수 없습니다." });
            }
          }
        );
      }
    }
  );
};
// 특정 카테고리 삭제 (특정 유저)
exports.deleteCategory = (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const userId = req.user.userId;
  console.log(
    `Attempting to delete category ID: ${categoryId} for user ID: ${userId}`
  );
  db.run(
    "DELETE FROM categories WHERE id = ? AND user_id = ?",
    [categoryId, userId],
    function (err) {
      // 일반 함수 표현식 유지
      console.log(`Error: ${err}`);
      console.log(
        `Changes: ${this ? this.changes : "this is null or undefined"}`
      ); // 이전 this 로깅 유지
      console.log(
        `Statement Changes: ${this ? this.lastID : "this is null or undefined"}`
      ); // lastID 로깅 (참고용)

      const stmt = this; // 콜백 함수 내에서 this를 stmt 변수에 할당

      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ message: "카테고리를 삭제하는데 실패했습니다." });
      } else {
        if (stmt && stmt.changes > 0) {
          // stmt 객체와 changes 속성 사용
          return res.status(204).send();
        } else {
          return res
            .status(404)
            .json({ message: "카테고리를 찾을 수 없습니다." });
        }
      }
    }
  );
};
