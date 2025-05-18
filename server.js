const express = require("express");
const app = express();
const port = 3000;
const path = require("path");
const cors = require("cors");

// 데이터베이스 연결 (database.js 파일을 불러와서 실행)
const db = require("./database");

app.use(
  cors({
    origin: "http://localhost:5173", // 프론트엔드 도메인 명시적으로 허용
    methods: "GET,HEAD,PUT,POST,DELETE,OPTIONS", // 허용할 HTTP 메서드
    credentials: true, // 쿠키 및 인증 헤더 공유 허용 (필요한 경우)
  })
);

// 미들웨어 설정 (예: JSON 파싱)
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // 정적 파일 서비스

// 라우트 연결
app.use("/api/users", require("./routes/users"));
app.use("/api/menus", require("./routes/menus"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));

app.get("/", (req, res) => {
  res.send("Hello from 주문하시개!");
});

app.listen(port, () => {
  console.log(
    `'주문하시개' 서버가 http://localhost:${port} 에서 시작되었습니다.`
  );
});
