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

// 유저 삭제
exports.deleteUser = (req, res) => {
  const userId = req.params.userId; // 요청 파라미터에서 유저 ID 가져오기

  db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "유저 삭제에 실패했습니다." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }
    res.status(200).json({ message: "유저가 성공적으로 삭제되었습니다." });
  });
};

// 유저 정보 조회
exports.getUserProfile = (req, res) => {
  const userId = req.user.userId; // 인증된 유저의 ID 가져오기
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res
        .status(500)
        .json({ message: "유저 정보를 조회하는데 실패했습니다." });
    }
    if (!row) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }
    res.status(200).json(row);
  });
};

// 특정 유저 정보 조회 (관리자용)
exports.getUserProfileById = (req, res) => {
  const userId = req.params.userId; // 요청 파라미터에서 유저 ID 가져오기
  const adminId = req.params.adminId; // 인증된 관리자의 ID 가져오기
  db.get(
    "SELECT u.* FROM users AS u JOIN user_admin_relationships AS uar ON u.id = uar.user_id WHERE uar.admin_id = ? AND uar.user_id = ?;",
    [adminId, userId],
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ message: "유저 정보를 조회하는데 실패했습니다." });
      }
      if (!row) {
        return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
      }
      res.status(200).json(row);
    }
  );
};

// 유저 정보 수정
exports.updateUserProfile = (req, res) => {
  const userId = req.user.userId; // 인증된 유저의 ID 가져오기
  const {
    store_name,
    store_address,
    industry,
    phone_number,
    business_hours,
    owner_name,
    email,
    password,
  } = req.body;

  // 비밀번호가 제공되면 암호화
  let hashedPassword = null;
  if (password) {
    hashedPassword = bcrypt.hashSync(password, 10);
  }

  db.run(
    `UPDATE users SET 
      store_name = ?, 
      store_address = ?, 
      industry = ?, 
      phone_number = ?, 
      business_hours = ?, 
      owner_name = ?, 
      email = ?${hashedPassword ? ", password = ?" : ""} 
      WHERE id = ?`,
    [
      store_name,
      store_address,
      industry,
      phone_number,
      business_hours,
      owner_name,
      email,
      ...(hashedPassword ? [hashedPassword] : []),
      userId,
    ],
    function (err) {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ message: "유저 정보를 수정하는데 실패했습니다." });
      }
      res
        .status(200)
        .json({ message: "유저 정보가 성공적으로 수정되었습니다." });
    }
  );
};

// 유저 인증 처리 (회원정보 수정 시 사용)
exports.verifyUserCredentials = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "이메일과 비밀번호를 모두 입력해주세요.",
    });
  }

  try {
    // Promise 기반 db.get 헬퍼 함수 (필요하다면 유틸리티 파일로 분리)
    const getAsync = (query, params) => {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    };

    const user = await getAsync("SELECT * FROM users WHERE email = ?", [email]);

    // 사용자가 존재하지 않거나 비밀번호가 일치하지 않는 경우
    // 보안을 위해 동일한 에러 메시지를 반환하여 계정 열거 공격을 방지한다.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    // 인증 성공 시
    return res.status(200).json({ success: true, message: "인증되었습니다." });
  } catch (error) {
    console.error("verifyUserCredentials 오류:", error);
    // 데이터베이스 오류 등 서버 측 문제 발생 시
    res
      .status(500)
      .json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 자녀 유저 정보 조회
exports.getChildUsers = (req, res) => {
  const userId = req.user.userId; // 인증된 유저의 ID 가져오기

  db.all(
    "SELECT * FROM user_admin_relationships WHERE admin_id = ?",
    [userId],
    (err, rows) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ message: "자녀 유저 정보를 조회하는데 실패했습니다." });
      }
      res.status(200).json(rows);
    }
  );
};
