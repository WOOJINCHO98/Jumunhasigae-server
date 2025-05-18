const jwt = require("jsonwebtoken");
const db = require("../database");
require("dotenv").config();

const isAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.sendStatus(401); // 토큰 없음
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(403); // 유효하지 않은 토큰
    }

    // 토큰에 포함된 userId를 사용하여 데이터베이스에서 사용자 정보 조회
    db.get(
      "SELECT role FROM users WHERE id = ?",
      [user.userId],
      (dbErr, row) => {
        if (dbErr) {
          console.error("데이터베이스 오류:", dbErr.message);
          return res.sendStatus(500);
        }

        if (row && row.role === "admin") {
          req.user = user; // 관리자 정보 요청 객체에 저장 (선택 사항)
          next(); // 다음 핸들러로 진행
        } else {
          return res.sendStatus(403); // 관리자 권한 없음
        }
      }
    );
  });
};

module.exports = isAdmin;
