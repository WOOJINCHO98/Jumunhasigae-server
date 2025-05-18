const sqlite3 = require("sqlite3").verbose();
const db = require("../database");

exports.adminCancelOrder = async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const adminId = req.user.userId;
  const { cancelReason } = req.body;

  try {
    // 1. 주문 존재 여부 및 해당 매장 주문, 취소 요청 상태 확인
    const order = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, admin_id, order_status, cancel_requested FROM orders WHERE id = ?",
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
      return res
        .status(403)
        .json({ message: "해당 매장의 주문만 취소할 수 있습니다." });
    }

    if (order.cancel_requested !== 1) {
      return res.status(400).json({ message: "취소 요청이 없는 주문입니다." });
    }

    if (
      order.order_status === "completed" ||
      order.order_status === "cancelled"
    ) {
      return res
        .status(400)
        .json({ message: "이미 완료 또는 취소된 주문입니다." });
    }

    // 2. 주문 상태를 'cancelled'로 업데이트하고 cancel_requested 를 0으로 변경
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE orders SET order_status = ?, cancel_requested = 0, updated_at = ? WHERE id = ?",
        ["cancelled", new Date(), orderId],
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
    const cancelledOrder = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (cancelledOrder) {
      res.json({ message: "주문이 취소되었습니다.", order: cancelledOrder });
    } else {
      res.status(500).json({ message: "주문 취소 처리 실패했습니다." });
    }
  } catch (error) {
    console.error("관리자 주문 취소 오류:", error);
    res.status(500).json({ message: "관리자 주문 취소 처리 실패했습니다." });
  }
};

exports.grantAccess = async (req, res) => {
  const { userId } = req.body;
  const adminId = req.user.userId; // 현재 로그인한 관리자의 ID

  if (!userId) {
    return res.status(400).json({ message: "유저 ID를 제공해주세요." });
  }

  try {
    // 부여 대상 유저가 존재하는지 확인
    const targetUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, role FROM users WHERE id = ?",
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!targetUser) {
      return res.status(404).json({ message: "존재하지 않는 유저 ID입니다." });
    }

    // 부여 대상 유저가 admin role 인지 확인 (추가 1)
    if (targetUser.role === "admin") {
      return res
        .status(400)
        .json({ message: "관리자에게는 접근 권한을 부여할 수 없습니다." });
    }

    // 현재 관리자가 이미 다른 유저에게 접근 권한을 부여했는지 확인 (추가 2)
    const existingRelationCount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) AS count FROM user_admin_relationships WHERE admin_id = ?",
        [adminId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.count);
          }
        }
      );
    });

    if (existingRelationCount >= 1) {
      return res.status(409).json({
        message:
          "관리자는 최대 한 명의 유저에게만 접근 권한을 부여할 수 있습니다.",
      });
    }

    // 이미 관계가 존재하는지 확인
    const existingRelation = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM user_admin_relationships WHERE user_id = ? AND admin_id = ?",
        [userId, adminId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (existingRelation) {
      return res
        .status(409)
        .json({ message: "이미 접근 권한이 부여된 유저입니다." });
    }

    // 관계 테이블에 데이터 삽입
    db.run(
      "INSERT INTO user_admin_relationships (user_id, admin_id) VALUES (?, ?)",
      [userId, adminId],
      function (err) {
        if (err) {
          console.error(err.message);
          return res
            .status(500)
            .json({ message: "접근 권한 부여에 실패했습니다." });
        } else {
          res.status(201).json({ message: "접근 권한이 부여되었습니다." });
        }
      }
    );
  } catch (error) {
    console.error("접근 권한 부여 오류:", error);
    res
      .status(500)
      .json({ message: "접근 권한 부여 처리 중 오류가 발생했습니다." });
  }
};
