const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token> 형식에서 토큰 추출

  if (token == null) {
    return res.sendStatus(401); // 토큰이 없으면 Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(403); // 토큰이 유효하지 않으면 Forbidden
    }
    req.user = user; // 토큰에서 추출한 유저 정보를 요청 객체에 저장
    next(); // 다음 미들웨어 또는 라우트 핸들러로 진행
  });
};

module.exports = authenticateToken;
