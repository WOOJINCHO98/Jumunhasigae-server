const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./mydatabase.db", (err) => {
  if (err) {
    console.error("데이터베이스 연결 실패:", err.message);
  } else {
    console.log("SQLite 데이터베이스에 연결되었습니다.");
  }
});

db.serialize(() => {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_name TEXT NOT NULL,
      store_address TEXT NOT NULL,
      industry TEXT,
      phone_number TEXT,
      business_hours TEXT,
      owner_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
    (err) => {
      if (err) {
        console.error("users 테이블 생성 실패:", err.message);
      } else {
        console.log("users 테이블이 생성되었거나 이미 존재합니다.");
      }
    }
  );
  db.run(
    `
    CREATE TABLE IF NOT EXISTS user_admin_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );
  `,
    (err) => {
      if (err) {
        console.error(
          "user_admin_relationships 테이블 생성 실패:",
          err.message
        );
      } else {
        console.log(
          "user_admin_relationships 테이블이 생성되었거나 이미 존재합니다."
        );
      }
    }
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id) 
    );
  `,
    (err) => {
      if (err) {
        console.error("menus 테이블 생성 실패:", err.message);
      } else {
        console.log("menus 테이블이 생성되었거나 이미 존재합니다.");
      }
    }
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `,
    (err) => {
      if (err) {
        console.error("categories 테이블 생성 실패:", err.message);
      } else {
        console.log("categories 테이블이 생성되었거나 이미 존재합니다.");
      }
    }
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL, -- 주문한 고객 (테이블) ID
      admin_id INTEGER NOT NULL, -- 주문이 접수된 매장의 관리자 ID
      order_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      table_number INTEGER NOT NULL, -- 테이블 번호 추가
      total_amount REAL NOT NULL, -- 총 주문 금액
      order_status TEXT DEFAULT 'pending', -- 주문 상태
      cancel_requested INTEGER DEFAULT 0, -- 주문 취소 요청 여부 (0: false, 1: true)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id), -- 연결된 테이블 (users 테이블을 테이블 정보 테이블로 활용)
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );
  `,
    (err) => {
      if (err) {
        console.error("orders 테이블 생성 실패:", err.message);
      } else {
        console.log("orders 테이블이 생성되었거나 이미 존재합니다.");
      }
    }
  );

  // order_items 테이블 (선택 사항: 주문 상세 정보 별도 관리)
  db.run(
    `
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL, -- 당시 메뉴 가격
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_id) REFERENCES menus(id)
  );
`,
    (err) => {
      if (err) {
        console.error("order_items 테이블 생성 실패:", err.message);
      } else {
        console.log("order_items 테이블이 생성되었거나 이미 존재합니다.");
      }
    }
  );
});

process.on("exit", () => {
  db.close((err) => {
    if (err) {
      console.error("데이터베이스 연결 종료 실패:", err.message);
    } else {
      console.log("데이터베이스 연결이 종료되었습니다.");
    }
  });
});

module.exports = db;
