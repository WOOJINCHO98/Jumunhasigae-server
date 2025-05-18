const sqlite3 = require("sqlite3").verbose();
const db = require("../database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // .env 파일 로드

// 로그인 처리
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 필수 필드 확인
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "이메일과 비밀번호를 입력해주세요." });
  }

  try {
    // 데이터베이스에서 유저 검색
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, password FROM users WHERE email = ?",
        [email],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    // 유저가 없거나 비밀번호가 일치하지 않는 경우
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "인증에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.",
      });
    }

    // JWT 생성
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    }); // 토큰 유효 시간 1시간

    res.status(200).json({ message: "로그인 성공", token: token });
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
  }
};
