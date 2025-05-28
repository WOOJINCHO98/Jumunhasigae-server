const sqlite3 = require("sqlite3").verbose();
const db = require("../database");

exports.getAllOrders = async (req, res) => {
  const userId = req.user.userId;

  try {
    // 사용자 역할 확인
    const userRole = await new Promise((resolve, reject) => {
      db.get("SELECT role FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.role : "user"); // 기본값으로 'user' 설정
        }
      });
    });

    let query = "SELECT * FROM orders WHERE ";
    let params = [];

    if (userRole === "admin") {
      // 관리자는 자신의 매장 (admin_id)에 대한 주문 목록 조회
      query += "admin_id = ? ORDER BY order_time DESC";
      params.push(userId);
    } else {
      // 일반 유저는 자신의 주문 목록 (user_id) 조회
      query += "user_id = ? ORDER BY order_time DESC";
      params.push(userId);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ message: "주문 목록을 가져오는데 실패했습니다." });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error("주문 목록 조회 오류:", error);
    res.status(500).json({ message: "주문 목록을 가져오는데 실패했습니다." });
  }
};

exports.getOrderDetail = async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const userId = req.user.userId;

  try {
    // 1. 주문 정보 조회
    const order = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    // 2. 사용자 역할 확인
    const userRole = await new Promise((resolve, reject) => {
      db.get("SELECT role FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.role : "user");
        }
      });
    });

    // 3. 접근 권한 확인
    if (userRole !== "admin" && order.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "주문 상세 정보를 볼 권한이 없습니다." });
    }
    if (userRole === "admin" && order.admin_id !== userId) {
      return res.status(403).json({ message: "해당 매장의 주문이 아닙니다." });
    }

    // 4. 주문 상세 항목 조회
    const orderItems = await new Promise((resolve, reject) => {
      db.all(
        "SELECT oi.*, m.name AS menu_name FROM order_items oi JOIN menus m ON oi.menu_id = m.id WHERE oi.order_id = ?",
        [orderId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });

    res.json({ order, orderItems });
  } catch (error) {
    console.error("주문 상세 정보 조회 오류:", error);
    res
      .status(500)
      .json({ message: "주문 상세 정보를 가져오는데 실패했습니다." });
  }
};

exports.addOrder = async (req, res) => {
  const { orderItems, tableNumber, adminId } = req.body;
  const userId = req.user.userId; // 주문하는 고객 (테이블) ID

  if (!orderItems || orderItems.length === 0 || !tableNumber || !adminId) {
    return res.status(400).json({ message: "주문 정보가 누락되었습니다." });
  }

  try {
    // 1. 주문 항목 유효성 검사 (메뉴 존재 여부 및 해당 매장 소속 여부)
    for (const item of orderItems) {
      const { menuId } = item;
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
        return res
          .status(400)
          .json({ message: `존재하지 않는 메뉴 ID: ${menuId}` });
      }

      if (menu.user_id !== adminId) {
        return res.status(400).json({
          message: `메뉴 ID: ${menuId}는 해당 매장의 메뉴가 아닙니다.`,
        });
      }
    }

    let totalAmount = 0;
    for (const item of orderItems) {
      totalAmount += item.quantity * item.price;
    }

    // 2. orders 테이블에 주문 정보 삽입
    const orderResult = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO orders (user_id, admin_id, order_time, table_number, total_amount) VALUES (?, ?, ?, ?, ?)",
        [userId, adminId, new Date(), tableNumber, totalAmount],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID); // 생성된 주문 ID 반환
          }
        }
      );
    });

    const orderId = orderResult;

    // 3. order_items 테이블에 주문 상세 정보 삽입
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        const { menuId, quantity, price } = item;
        await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO order_items (order_id, menu_id, quantity, price) VALUES (?, ?, ?, ?)",
            [orderId, menuId, quantity, price],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        });
      }
    }

    // 4. 성공 응답
    db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ message: "주문 생성 후 정보를 가져오는데 실패했습니다." });
      }
      res.status(201).json(row);
    });
  } catch (error) {
    console.error("주문 생성 오류:", error);
    res.status(500).json({ message: "주문 생성에 실패했습니다." });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const adminId = req.user.userId;
  const { orderStatus } = req.body;
  const allowedStatuses = [
    "pending",
    "accepted",
    "preparing",
    "shipping",
    "completed",
    "cancelled",
  ];

  if (!orderStatus || !allowedStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: "유효하지 않은 주문 상태입니다." });
  }

  try {
    // 1. 주문 존재 여부 및 해당 매장의 주문인지 확인
    const order = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, admin_id FROM orders WHERE id = ?",
        [orderId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (order.admin_id !== adminId) {
      return res.status(403).json({ message: "해당 매장의 주문이 아닙니다." });
    }

    // 2. 주문 상태 업데이트
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?",
        [orderStatus, new Date(), orderId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });

    // 3. 업데이트 결과 확인 및 응답
    const updatedOrder = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (updatedOrder) {
      res.json(updatedOrder);
    } else {
      res.status(500).json({ message: "주문 상태 업데이트에 실패했습니다." });
    }
  } catch (error) {
    console.error("주문 상태 업데이트 오류:", error);
    res.status(500).json({ message: "주문 상태 업데이트에 실패했습니다." });
  }
};

exports.requestOrderCancellation = async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const userId = req.user.userId;

  try {
    // 1. 주문 존재 여부 및 본인 주문 확인
    const order = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, user_id, order_status, cancel_requested FROM orders WHERE id = ?",
        [orderId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({
        message: "자신의 주문에 대해서만 취소 요청을 할 수 있습니다.",
      });
    }

    if (order.order_status !== "pending" && order.order_status !== "accepted") {
      return res
        .status(400)
        .json({ message: "이미 처리 중인 주문은 취소 요청을 할 수 없습니다." });
    }

    if (order.cancel_requested === 1) {
      return res
        .status(409)
        .json({ message: "이미 취소 요청이 접수된 주문입니다." });
    }

    // 2. 주문의 cancel_requested 상태를 1로 업데이트
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE orders SET cancel_requested = 1, updated_at = ? WHERE id = ?",
        [new Date(), orderId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });

    // 3. 성공 응답
    const updatedOrder = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (updatedOrder) {
      res.json({
        message: "주문 취소 요청이 완료되었습니다.",
        order: updatedOrder,
      });
    } else {
      res
        .status(500)
        .json({ message: "주문 취소 요청 상태 업데이트에 실패했습니다." });
    }
  } catch (error) {
    console.error("주문 취소 요청 오류:", error);
    res.status(500).json({ message: "주문 취소 요청에 실패했습니다." });
  }
};

// 특정 주문 삭제 (특정 유저)
exports.deleteOrder = (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const userId = req.user.userId;
  db.run(
    "DELETE FROM orders WHERE id = ? AND user_id = ?",
    [orderId, userId],
    (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).json({ message: "주문을 삭제하는데 실패했습니다." });
      } else if (this.changes > 0) {
        res.status(204).send(); // No Content
      } else {
        res.status(404).json({ message: "주문을 찾을 수 없습니다." });
      }
    }
  );
};
