const sqlite3 = require("sqlite3").verbose();
const db = require("../database"); // 데이터베이스 연결 가져오기
const bcrypt = require("bcrypt"); // 비밀번호 암호화 라이브러리 (설치 필요: npm install bcrypt)

// 유저 등록 처리
exports.registerUser = async (req, res) => {
  const {
    store_name,
    store_address,
    industry,
    phone_number,
    business_hours,
    owner_name,
    email,
    password,
    role,
  } = req.body;

  // 필수 필드 확인
  if (!store_name || !store_address || !owner_name || !email || !password) {
    return res.status(400).json({ message: "필수 정보를 모두 입력해주세요." });
  }

  try {
    // 이메일 중복 확인
    const existingUser = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (existingUser) {
      return res.status(409).json({ message: "이미 등록된 이메일입니다." });
    }

    // 비밀번호 암호화 (saltRounds는 임의의 값)
    const hashedPassword = await bcrypt.hash(password, 10);

    // users 테이블에 유저 정보 저장
    const result = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (store_name, store_address, industry, phone_number, business_hours, owner_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          store_name,
          store_address,
          industry,
          phone_number,
          business_hours,
          owner_name,
          email,
          hashedPassword,
          role,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID); // 새로 생성된 유저 ID 반환
          }
        }
      );
    });

    const userId = result;

    // 유저 등록 성공
    res
      .status(201)
      .json({ message: "회원가입이 완료되었습니다.", userId: userId });
  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).json({ message: "회원가입에 실패했습니다." });
  }
};
