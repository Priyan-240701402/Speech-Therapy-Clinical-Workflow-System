import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db.js";
import { requireAuth, requireRole } from "../middleware.js";
import { asyncHandler, parsePagination } from "../lib/http.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config.js";

export const registerCoreRoutes = (app, { dbPromise }) => {
  app.get("/", (req, res) => {
    res.json({ ok: true, service: "speech-therapy-backend" });
  });

  app.post("/auth/login", asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    await dbPromise;
    const db = getDb();
    const result = await db.query(
      "SELECT id, username, display_name AS \"displayName\", password_hash, role FROM users WHERE username = $1",
      [username]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || null,
        role: user.role,
      },
    });
  }));

  app.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.get(
    "/admin/overview",
    requireAuth,
    requireRole(["admin", "supervisor"]),
    (req, res) => {
      res.json({ ok: true, role: req.user.role });
    }
  );

  app.get("/dashboard", requireAuth, asyncHandler(async (req, res) => {
    await dbPromise;
    const db = getDb();
    const role = req.user?.role;

    const activePatientsResult = await db.query(
      "SELECT COUNT(*)::int AS count FROM patients WHERE status = 'active'"
    );
    const pendingPatientsResult = await db.query(
      "SELECT COUNT(*)::int AS count FROM patients WHERE status = 'pending'"
    );
    const reportsDueResult = await db.query(
      "SELECT COUNT(*)::int AS count FROM reports WHERE due_date IS NOT NULL AND due_date <= CURRENT_DATE AND status != 'approved'"
    );

    let pendingApprovals = pendingPatientsResult.rows[0]?.count ?? 0;

    if (role === "admin" || role === "supervisor") {
      const pendingReportsResult = await db.query(
        "SELECT COUNT(*)::int AS count FROM reports WHERE status = 'submitted'"
      );
      const pendingPlansResult = await db.query(
        "SELECT COUNT(*)::int AS count FROM therapy_plans WHERE status = 'pending'"
      );
      pendingApprovals +=
        (pendingReportsResult.rows[0]?.count ?? 0) +
        (pendingPlansResult.rows[0]?.count ?? 0);
    }

    const notificationsResult = await db.query(
      `SELECT n.id,
              n.type,
              n.message,
              n.is_read AS "isRead",
              n.created_at AS "createdAt"
       FROM notifications n
       WHERE n.user_id = $1 OR n.user_id IS NULL
       ORDER BY n.created_at DESC
       LIMIT 10`,
      [req.user.id]
    );

    const activitiesResult = await db.query(
      `SELECT a.id,
              COALESCE(u.username, a.actor_username) AS actor,
              a.action_type AS "actionType",
              a.entity_type AS "entityType",
              a.entity_id AS "entityId",
              a.message,
              a.metadata,
              a.created_at AS "createdAt"
       FROM activities a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC
       LIMIT 6`
    );

    res.json({
      stats: {
        activePatients: activePatientsResult.rows[0]?.count ?? 0,
        pendingApprovals,
        reportsDue: reportsDueResult.rows[0]?.count ?? 0,
      },
      notifications: notificationsResult.rows,
      recentActivity: activitiesResult.rows,
    });
  }));

  app.get("/activities", asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 20, maxLimit: 100 });
    await dbPromise;
    const db = getDb();
    const result = await db.query(
      `SELECT a.id,
              COALESCE(u.username, a.actor_username) AS actor,
              a.action_type AS "actionType",
              a.entity_type AS "entityType",
              a.entity_id AS "entityId",
              a.message,
              a.metadata,
              a.created_at AS "createdAt"
       FROM activities a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ activities: result.rows, pagination: { page, limit, offset } });
  }));

  app.get("/notifications", asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 20, maxLimit: 100 });
    const userId = req.query.userId ? Number(req.query.userId) : null;
    const includeAll = req.query.includeAll !== "false";
    const unreadOnly = req.query.unreadOnly === "true";

    await dbPromise;
    const db = getDb();

    const params = [];
    const where = [];
    if (userId) {
      params.push(userId);
      where.push(`(n.user_id = $${params.length}`);
      if (includeAll) {
        where[where.length - 1] += " OR n.user_id IS NULL)";
      } else {
        where[where.length - 1] += ")";
      }
    }
    if (unreadOnly) {
      where.push("n.is_read = FALSE");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT n.id,
              n.user_id AS "userId",
              n.type,
              n.message,
              n.activity_id AS "activityId",
              n.is_read AS "isRead",
              n.created_at AS "createdAt"
       FROM notifications n
       ${whereSql}
       ORDER BY n.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ notifications: result.rows, pagination: { page, limit, offset } });
  }));
};
