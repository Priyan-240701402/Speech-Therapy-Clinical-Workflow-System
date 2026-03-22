import { getDb } from "../db.js";
import { requireAuth, requireRole } from "../middleware.js";
import { asyncHandler, parsePagination } from "../lib/http.js";
import { parseAuthUser } from "../lib/auth.js";
import { logActivity, createNotification, notifyRoles } from "../lib/activity.js";
import {
  ensureTherapistAssigned,
  normalizeValue,
  therapistDisplayNameByUsername,
} from "../lib/therapists.js";

export const registerTherapyRoutes = (app, { dbPromise }) => {
  app.post("/reports", asyncHandler(async (req, res) => {
    const {
      patientId,
      patientName,
      patientAge,
      diagnosis,
      therapistName,
      sessionsCompleted,
      totalSessions,
      initialAssessment,
      progressNotes,
      currentStatus,
      recommendations,
      supervisorComment,
      dueDate,
      status,
    } = req.body || {};
    const allowed = ["draft", "submitted", "approved", "needs-revision"];
    const reportStatus = allowed.includes(status) ? status : "draft";

    await dbPromise;
    const db = getDb();
    const insert = await db.query(
      `INSERT INTO reports
        (patient_id, patient_name, patient_age, diagnosis, therapist_name,
         sessions_completed, total_sessions, initial_assessment, progress_notes,
         current_status, recommendations, supervisor_comment, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id,
                patient_id AS "patientId",
                patient_name AS "patientName",
                patient_age AS "patientAge",
                diagnosis,
                therapist_name AS "therapist",
                sessions_completed AS "sessionsCompleted",
                total_sessions AS "totalSessions",
                initial_assessment AS "initialAssessment",
                progress_notes AS "progressNotes",
                current_status AS "currentStatus",
                recommendations,
                supervisor_comment AS "supervisorComment",
                status,
                due_date AS "dueDate",
                created_at AS "createdAt"`,
      [
        patientId || null,
        patientName || null,
        patientAge || null,
        diagnosis || null,
        therapistName || null,
        Number.isFinite(Number(sessionsCompleted)) ? Number(sessionsCompleted) : 0,
        Number.isFinite(Number(totalSessions)) ? Number(totalSessions) : 0,
        initialAssessment || null,
        progressNotes || null,
        currentStatus || null,
        recommendations || null,
        supervisorComment || null,
        reportStatus,
        dueDate || null,
      ]
    );

    const report = insert.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "report_created",
      entityType: "report",
      entityId: report.id,
      message: `Report created with status ${report.status}`,
      metadata: { dueDate: report.dueDate },
    });

    if (report.status === "submitted") {
      await notifyRoles(db, ["admin", "supervisor"], {
        type: "pending",
        message: "New report submitted for review",
        activityId: activity.id,
      });
    }

    res.status(201).json({ report, activity });
  }));

  app.get("/reports", asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 25, maxLimit: 200 });
    await dbPromise;
    const db = getDb();
    const result = await db.query(
      `SELECT id,
              patient_id AS "patientId",
              patient_name AS "patientName",
              patient_age AS "patientAge",
              diagnosis,
              therapist_name AS "therapist",
              sessions_completed AS "sessionsCompleted",
              total_sessions AS "totalSessions",
              initial_assessment AS "initialAssessment",
              progress_notes AS "progressNotes",
              current_status AS "currentStatus",
              recommendations,
              supervisor_comment AS "supervisorComment",
              status,
              due_date AS "dueDate",
              created_at AS "createdAt"
       FROM reports
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ reports: result.rows, pagination: { page, limit, offset } });
  }));

  app.patch("/reports/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      patientName,
      patientAge,
      diagnosis,
      therapist,
      sessionsCompleted,
      totalSessions,
      initialAssessment,
      progressNotes,
      currentStatus,
      recommendations,
    } = req.body || {};

    await dbPromise;
    const db = getDb();
    const update = await db.query(
      `UPDATE reports
       SET patient_name = COALESCE($1, patient_name),
           patient_age = COALESCE($2, patient_age),
           diagnosis = COALESCE($3, diagnosis),
           therapist_name = COALESCE($4, therapist_name),
           sessions_completed = COALESCE($5, sessions_completed),
           total_sessions = COALESCE($6, total_sessions),
           initial_assessment = COALESCE($7, initial_assessment),
           progress_notes = COALESCE($8, progress_notes),
           current_status = COALESCE($9, current_status),
           recommendations = COALESCE($10, recommendations)
       WHERE id = $11
       RETURNING id,
                 patient_id AS "patientId",
                 patient_name AS "patientName",
                 patient_age AS "patientAge",
                 diagnosis,
                 therapist_name AS "therapist",
                 sessions_completed AS "sessionsCompleted",
                 total_sessions AS "totalSessions",
                 initial_assessment AS "initialAssessment",
                 progress_notes AS "progressNotes",
                 current_status AS "currentStatus",
                 recommendations,
                 supervisor_comment AS "supervisorComment",
                 status,
                 due_date AS "dueDate",
                 created_at AS "createdAt"`,
      [
        patientName ?? null,
        Number.isFinite(Number(patientAge)) ? Number(patientAge) : null,
        diagnosis ?? null,
        therapist ?? null,
        Number.isFinite(Number(sessionsCompleted)) ? Number(sessionsCompleted) : null,
        Number.isFinite(Number(totalSessions)) ? Number(totalSessions) : null,
        initialAssessment ?? null,
        progressNotes ?? null,
        currentStatus ?? null,
        recommendations ?? null,
        Number(id),
      ]
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = update.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "report_updated",
      entityType: "report",
      entityId: report.id,
      message: `Report updated for ${report.patientName || "patient"}`,
      metadata: { status: report.status },
    });

    res.json({ report, activity });
  }));

  app.patch("/reports/:id/status", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, supervisorComment } = req.body || {};
    const allowed = ["draft", "submitted", "approved", "needs-revision"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await dbPromise;
    const db = getDb();
    const update = await db.query(
      `UPDATE reports
       SET status = $1,
           supervisor_comment = COALESCE($2, supervisor_comment)
       WHERE id = $3
       RETURNING id,
                 patient_id AS "patientId",
                 patient_name AS "patientName",
                 patient_age AS "patientAge",
                 diagnosis,
                 therapist_name AS "therapist",
                 sessions_completed AS "sessionsCompleted",
                 total_sessions AS "totalSessions",
                 initial_assessment AS "initialAssessment",
                 progress_notes AS "progressNotes",
                 current_status AS "currentStatus",
                 recommendations,
                 supervisor_comment AS "supervisorComment",
                 status,
                 due_date AS "dueDate",
                 created_at AS "createdAt"`,
      [status, supervisorComment || null, Number(id)]
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = update.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "report_status_updated",
      entityType: "report",
      entityId: report.id,
      message: `Report status updated to ${report.status}`,
      metadata: { status: report.status },
    });

    if (report.status === "submitted") {
      await notifyRoles(db, ["admin", "supervisor"], {
        type: "pending",
        message: "Report submitted for review",
        activityId: activity.id,
      });
    }

    if (report.status === "approved") {
      await createNotification(db, {
        type: "approved",
        message: "Report approved by supervisor",
        activityId: activity.id,
      });
    }

    res.json({ report, activity });
  }));
  app.get("/therapy-plans", asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 25, maxLimit: 200 });
    await dbPromise;
    const db = getDb();
    const result = await db.query(
      `SELECT id,
              patient_name AS "patientName",
              goal,
              activities,
              duration,
              status,
              therapist_name AS "therapist",
              supervisor_comment AS "supervisorComment",
              created_at AS "createdAt"
       FROM therapy_plans
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ plans: result.rows, pagination: { page, limit, offset } });
  }));

  app.post("/therapy-plans", asyncHandler(async (req, res) => {
    const { patientName, goal, activities, duration, therapist, status } = req.body || {};
    if (!patientName || !goal || !Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({ error: "patientName, goal, activities required" });
    }

    await dbPromise;
    const db = getDb();
    const insert = await db.query(
      `INSERT INTO therapy_plans (patient_name, goal, activities, duration, status, therapist_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 patient_name AS "patientName",
                 goal,
                 activities,
                 duration,
                 status,
                 therapist_name AS "therapist",
                 supervisor_comment AS "supervisorComment",
                 created_at AS "createdAt"`,
      [
        patientName,
        goal,
        JSON.stringify(activities),
        Number(duration) || 1,
        status || "pending",
        therapist || null,
      ]
    );

    const plan = insert.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "therapy_plan_created",
      entityType: "therapy_plan",
      entityId: plan.id,
      message: `Therapy plan created for ${plan.patientName}`,
      metadata: { status: plan.status },
    });

    await notifyRoles(db, ["admin", "supervisor"], {
      type: "pending",
      message: "New therapy plan submitted for review",
      activityId: activity.id,
    });

    res.status(201).json({ plan, activity });
  }));

  app.patch("/therapy-plans/:id/status", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, supervisorComment } = req.body || {};
    const allowed = ["approved", "pending", "changes-requested"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await dbPromise;
    const db = getDb();
    const update = await db.query(
      `UPDATE therapy_plans
       SET status = $1,
           supervisor_comment = COALESCE($2, supervisor_comment)
       WHERE id = $3
       RETURNING id,
                 patient_name AS "patientName",
                 goal,
                 activities,
                 duration,
                 status,
                 therapist_name AS "therapist",
                 supervisor_comment AS "supervisorComment",
                 created_at AS "createdAt"`,
      [status, supervisorComment || null, Number(id)]
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const plan = update.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "therapy_plan_status_updated",
      entityType: "therapy_plan",
      entityId: plan.id,
      message: `Therapy plan status updated to ${plan.status}`,
      metadata: { status: plan.status },
    });

    if (plan.status === "approved") {
      await createNotification(db, {
        type: "approved",
        message: "Therapy plan approved",
        activityId: activity.id,
      });

      const patientLookup = await db.query(
        "SELECT id FROM patients WHERE name = $1",
        [plan.patientName]
      );
      const patientId = patientLookup.rows[0]?.id;
      if (patientId && plan.duration > 0) {
        for (let i = 1; i <= plan.duration; i += 1) {
          await db.query(
            `INSERT INTO sessions
              (patient_id, patient_name, therapist_username, therapy_plan_id, session_number, status)
             VALUES ($1, $2, $3, $4, $5, 'upcoming')
             ON CONFLICT (patient_id, session_number) DO NOTHING`,
            [patientId, plan.patientName, plan.therapist || null, plan.id, i]
          );
        }
      }
    }

    res.json({ plan, activity });
  }));

  app.get("/sessions", requireAuth, asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 50, maxLimit: 500 });
    await dbPromise;
    const db = getDb();
    const role = req.user?.role;
    const baseSql = `
      SELECT s.id,
             s.patient_id AS "patientId",
             s.patient_name AS "patientName",
             s.therapist_username AS "therapistUsername",
             s.therapy_plan_id AS "therapyPlanId",
             s.session_number AS "sessionNumber",
             s.session_date AS "sessionDate",
             s.status,
             s.notes,
             s.activities,
             s.progress,
             s.supervisor_feedback AS "supervisorFeedback",
             tp.duration AS "planDuration"
      FROM sessions s
      LEFT JOIN therapy_plans tp
        ON tp.id = s.therapy_plan_id
    `;

    let result;
    if (role === "therapist") {
      const therapistDisplayName = therapistDisplayNameByUsername.get(req.user.username) || "";
      result = await db.query(
        `${baseSql}
         JOIN patients p ON p.id = s.patient_id
         WHERE p.assigned_therapist = $1 OR p.assigned_therapist = $2
         ORDER BY s.patient_name, s.session_number
         LIMIT $3 OFFSET $4`,
        [req.user.username, therapistDisplayName, limit, offset]
      );
    } else if (role === "admin" || role === "supervisor") {
      result = await db.query(
        `${baseSql}
         ORDER BY s.patient_name, s.session_number
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    const grouped = new Map();
    for (const row of result.rows) {
      const key = row.patientId ?? row.patientName;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: row.patientId ?? row.id,
          patientName: row.patientName,
          sessions: [],
          planDuration: row.planDuration ?? null,
        });
      }
      let activities = [];
      if (Array.isArray(row.activities)) {
        activities = row.activities;
      } else if (typeof row.activities === "string") {
        try {
          activities = JSON.parse(row.activities);
        } catch {
          activities = [];
        }
      }

      grouped.get(key).sessions.push({
        id: row.id,
        therapistUsername: row.therapistUsername,
        therapyPlanId: row.therapyPlanId,
        sessionNumber: row.sessionNumber,
        date: row.sessionDate,
        status: row.status,
        notes: row.notes,
        activities,
        progress: row.progress,
        supervisorFeedback: row.supervisorFeedback,
      });
    }

    const patientSessions = Array.from(grouped.values()).map((item) => {
      const completed = item.sessions.filter((s) => s.status === "completed").length;
      const total = Math.max(item.sessions.length, item.planDuration || 0);
      return {
        id: item.id,
        patientName: item.patientName,
        totalSessions: total,
        completedSessions: completed,
        sessions: item.sessions,
        goal: "Therapy progress tracking",
      };
    });

    res.json({ patientSessions, pagination: { page, limit, offset } });
  }));
  app.post("/sessions", requireAuth, requireRole(["therapist"]), asyncHandler(async (req, res) => {
    const {
      patientId,
      sessionNumber,
      sessionDate,
      activities,
      notes,
      progress,
      status,
    } = req.body || {};

    if (!patientId || !sessionNumber) {
      return res
        .status(400)
        .json({ error: "patientId and sessionNumber required" });
    }

    const allowed = ["completed", "upcoming", "in-progress"];
    const sessionStatus = allowed.includes(status) ? status : "upcoming";
    const activitiesValue = Array.isArray(activities) ? activities : [];

    await dbPromise;
    const db = getDb();

    const assignedCheck = await ensureTherapistAssigned(
      db,
      patientId,
      req.user.username
    );
    if (!assignedCheck.ok) {
      return res.status(403).json({ error: assignedCheck.reason });
    }
    let resolvedPlanId = req.body?.therapyPlanId ? Number(req.body.therapyPlanId) : null;
    let plan = null;
    if (resolvedPlanId) {
      const planLookup = await db.query(
        "SELECT id, patient_name AS \"patientName\" FROM therapy_plans WHERE id = $1",
        [resolvedPlanId]
      );
      plan = planLookup.rows[0] || null;
    } else {
      const planLookup = await db.query(
        `SELECT id, patient_name AS "patientName"
         FROM therapy_plans
         WHERE patient_name = $1 AND status = 'approved'
         ORDER BY created_at DESC
         LIMIT 1`,
        [assignedCheck.patient.name]
      );
      plan = planLookup.rows[0] || null;
      resolvedPlanId = plan?.id ?? null;
    }

    if (!plan) {
      return res.status(400).json({
        error: "Approved therapy plan required for this patient",
      });
    }
    const normalizedPlanName = normalizeValue(plan.patientName);
    const normalizedPatientName = normalizeValue(assignedCheck.patient.name);
    if (normalizedPlanName !== normalizedPatientName) {
      return res.status(400).json({
        error: "Therapy plan does not match patient",
        details: {
          planPatientName: plan.patientName,
          patientName: assignedCheck.patient.name,
        },
      });
    }

    let insert;
    try {
      insert = await db.query(
        `INSERT INTO sessions
          (patient_id, patient_name, therapist_username, therapy_plan_id, session_number,
           session_date, status, notes, activities, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, patient_id AS "patientId", patient_name AS "patientName",
                   therapist_username AS "therapistUsername",
                   therapy_plan_id AS "therapyPlanId",
                   session_number AS "sessionNumber",
                   session_date AS "sessionDate",
                   status, notes, activities, progress,
                   supervisor_feedback AS "supervisorFeedback"`,
        [
          Number(patientId),
          assignedCheck.patient.name,
          req.user.username,
          Number(resolvedPlanId),
          Number(sessionNumber),
          sessionDate || null,
          sessionStatus,
          notes || null,
          JSON.stringify(activitiesValue),
          progress || null,
        ]
      );
    } catch (err) {
      if (err?.code === "23505") {
        return res.status(409).json({ error: "Session number already exists" });
      }
      throw err;
    }

    const session = insert.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "session_created",
      entityType: "session",
      entityId: session.id,
      message: `Session ${session.sessionNumber} created for ${session.patientName}`,
      metadata: { status: session.status },
    });

    res.status(201).json({ session, activity });
  }));

  app.patch("/sessions/:id", requireAuth, requireRole(["therapist"]), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      sessionDate,
      activities,
      notes,
      progress,
      status,
    } = req.body || {};

    const allowed = ["completed", "upcoming", "in-progress"];
    const sessionStatus = status && allowed.includes(status) ? status : null;
    const activitiesValue = Array.isArray(activities) ? activities : null;

    await dbPromise;
    const db = getDb();

    const sessionLookup = await db.query(
      "SELECT id, patient_id AS \"patientId\" FROM sessions WHERE id = $1",
      [Number(id)]
    );
    const existing = sessionLookup.rows[0];
    if (!existing) {
      return res.status(404).json({ error: "Session not found" });
    }

    const assignedCheck = await ensureTherapistAssigned(
      db,
      existing.patientId,
      req.user.username
    );
    if (!assignedCheck.ok) {
      return res.status(403).json({ error: assignedCheck.reason });
    }

    const update = await db.query(
      `UPDATE sessions
       SET session_date = COALESCE($1, session_date),
           status = COALESCE($2, status),
           notes = COALESCE($3, notes),
           activities = COALESCE($4, activities),
           progress = COALESCE($5, progress)
       WHERE id = $6
       RETURNING id, patient_id AS "patientId", patient_name AS "patientName",
                 therapist_username AS "therapistUsername",
                 therapy_plan_id AS "therapyPlanId",
                 session_number AS "sessionNumber",
                 session_date AS "sessionDate",
                 status, notes, activities, progress,
                 supervisor_feedback AS "supervisorFeedback"`,
      [
        sessionDate || null,
        sessionStatus,
        notes || null,
        activitiesValue ? JSON.stringify(activitiesValue) : null,
        progress || null,
        Number(id),
      ]
    );

    const session = update.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "session_updated",
      entityType: "session",
      entityId: session.id,
      message: `Session ${session.sessionNumber} updated for ${session.patientName}`,
      metadata: { status: session.status },
    });

    res.json({ session, activity });
  }));

  app.patch(
    "/sessions/:id/feedback",
    requireAuth,
    requireRole(["supervisor"]),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { supervisorFeedback } = req.body || {};
      if (!supervisorFeedback || !supervisorFeedback.trim()) {
        return res.status(400).json({ error: "supervisorFeedback required" });
      }

      await dbPromise;
      const db = getDb();
      const update = await db.query(
        `UPDATE sessions
         SET supervisor_feedback = $1
         WHERE id = $2
         RETURNING id, patient_id AS "patientId", patient_name AS "patientName",
                   therapist_username AS "therapistUsername",
                   therapy_plan_id AS "therapyPlanId",
                   session_number AS "sessionNumber",
                   session_date AS "sessionDate",
                   status, notes, activities, progress,
                   supervisor_feedback AS "supervisorFeedback"`,
        [supervisorFeedback.trim(), Number(id)]
      );

      if (!update.rows.length) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = update.rows[0];
      const actor = parseAuthUser(req);
      const activity = await logActivity(db, {
        actorUserId: actor?.id,
        actorUsername: actor?.username || req.body?.actorUsername,
        actionType: "session_reviewed",
        entityType: "session",
        entityId: session.id,
        message: `Session ${session.sessionNumber} reviewed for ${session.patientName}`,
        metadata: { supervisorFeedback: true },
      });

      res.json({ session, activity });
    })
  );

  app.delete(
    "/sessions/:id",
    requireAuth,
    requireRole(["therapist", "admin"]),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await dbPromise;
      const db = getDb();

      if (req.user.role === "therapist") {
        const sessionLookup = await db.query(
          "SELECT id, patient_id AS \"patientId\" FROM sessions WHERE id = $1",
          [Number(id)]
        );
        const existing = sessionLookup.rows[0];
        if (!existing) {
          return res.status(404).json({ error: "Session not found" });
        }
        const assignedCheck = await ensureTherapistAssigned(
          db,
          existing.patientId,
          req.user.username
        );
        if (!assignedCheck.ok) {
          return res.status(403).json({ error: assignedCheck.reason });
        }
      }

      const result = await db.query(
        `DELETE FROM sessions
         WHERE id = $1
         RETURNING id, patient_id AS "patientId", patient_name AS "patientName",
                   therapist_username AS "therapistUsername",
                   therapy_plan_id AS "therapyPlanId",
                   session_number AS "sessionNumber",
                   session_date AS "sessionDate", status, notes`,
        [Number(id)]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = result.rows[0];
      const actor = parseAuthUser(req);
      const activity = await logActivity(db, {
        actorUserId: actor?.id,
        actorUsername: actor?.username || req.body?.actorUsername,
        actionType: "session_deleted",
        entityType: "session",
        entityId: session.id,
        message: `Session ${session.sessionNumber} deleted for ${session.patientName}`,
        metadata: {},
      });

      res.json({ session, activity });
    })
  );
  app.patch(
    "/sessions/:patientId/:sessionNumber",
    requireAuth,
    requireRole(["therapist"]),
    asyncHandler(async (req, res) => {
      const { patientId, sessionNumber } = req.params;
      const { sessionDate, status, notes, activities, progress } = req.body || {};
      const allowed = ["completed", "upcoming", "in-progress"];
      const sessionStatus = status && allowed.includes(status) ? status : null;
      const activitiesValue = Array.isArray(activities) ? activities : null;

      await dbPromise;
      const db = getDb();
      const assignedCheck = await ensureTherapistAssigned(
        db,
        patientId,
        req.user.username
      );
      if (!assignedCheck.ok) {
        return res.status(403).json({ error: assignedCheck.reason });
      }
      const update = await db.query(
        `UPDATE sessions
         SET session_date = COALESCE($1, session_date),
             status = COALESCE($2, status),
             notes = COALESCE($3, notes),
             activities = COALESCE($4, activities),
             progress = COALESCE($5, progress),
             therapist_username = COALESCE($6, therapist_username)
         WHERE patient_id = $7 AND session_number = $8
         RETURNING id, patient_id AS "patientId", patient_name AS "patientName",
                   therapist_username AS "therapistUsername",
                   therapy_plan_id AS "therapyPlanId",
                   session_number AS "sessionNumber", session_date AS "sessionDate", status, notes,
                   activities, progress, supervisor_feedback AS "supervisorFeedback"`,
        [
          sessionDate || null,
          sessionStatus,
          notes || null,
          activitiesValue ? JSON.stringify(activitiesValue) : null,
          progress || null,
          req.user.username,
          Number(patientId),
          Number(sessionNumber),
        ]
      );

      if (!update.rows.length) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = update.rows[0];
      const actor = parseAuthUser(req);
      const activity = await logActivity(db, {
        actorUserId: actor?.id,
        actorUsername: actor?.username || req.body?.actorUsername,
        actionType: "session_updated",
        entityType: "session",
        entityId: session.id,
        message: `Session ${session.sessionNumber} updated for ${session.patientName}`,
        metadata: { status: session.status },
      });

      res.json({ session, activity });
    })
  );

  app.delete(
    "/sessions/:patientId/:sessionNumber",
    requireAuth,
    requireRole(["therapist"]),
    asyncHandler(async (req, res) => {
      const { patientId, sessionNumber } = req.params;
      await dbPromise;
      const db = getDb();
      const assignedCheck = await ensureTherapistAssigned(
        db,
        patientId,
        req.user.username
      );
      if (!assignedCheck.ok) {
        return res.status(403).json({ error: assignedCheck.reason });
      }
      const result = await db.query(
        `DELETE FROM sessions
         WHERE patient_id = $1 AND session_number = $2
         RETURNING id, patient_id AS "patientId", patient_name AS "patientName",
                   therapist_username AS "therapistUsername",
                   therapy_plan_id AS "therapyPlanId",
                   session_number AS "sessionNumber", session_date AS "sessionDate", status, notes`,
        [Number(patientId), Number(sessionNumber)]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = result.rows[0];
      const actor = parseAuthUser(req);
      const activity = await logActivity(db, {
        actorUserId: actor?.id,
        actorUsername: actor?.username || req.body?.actorUsername,
        actionType: "session_deleted",
        entityType: "session",
        entityId: session.id,
        message: `Session ${session.sessionNumber} deleted for ${session.patientName}`,
        metadata: {},
      });

      res.json({ session, activity });
    })
  );

  app.post(
    "/sessions/complete",
    requireAuth,
    requireRole(["therapist"]),
    asyncHandler(async (req, res) => {
      const {
        patientId,
        patientName,
        therapyPlanId,
        sessionNumber,
        notes,
        sessionDate,
        activities,
        progress,
      } = req.body || {};
      if (!patientId || !patientName || !therapyPlanId || !sessionNumber) {
        return res.status(400).json({
          error: "patientId, patientName, therapyPlanId, and sessionNumber required",
        });
      }

      await dbPromise;
      const db = getDb();
      const assignedCheck = await ensureTherapistAssigned(
        db,
        patientId,
        req.user.username
      );
      if (!assignedCheck.ok) {
        return res.status(403).json({ error: assignedCheck.reason });
      }
      const activitiesValue = Array.isArray(activities) ? activities : [];
      const upsert = await db.query(
        `INSERT INTO sessions
          (patient_id, patient_name, therapist_username, therapy_plan_id,
           session_number, session_date, status, notes, activities, progress)
         VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8, $9)
         ON CONFLICT (patient_id, session_number)
         DO UPDATE SET status = 'completed',
                       notes = EXCLUDED.notes,
                       session_date = EXCLUDED.session_date,
                       activities = EXCLUDED.activities,
                       progress = EXCLUDED.progress,
                       therapist_username = EXCLUDED.therapist_username,
                       therapy_plan_id = EXCLUDED.therapy_plan_id
         RETURNING id, patient_id AS "patientId", patient_name AS "patientName",
                   therapist_username AS "therapistUsername",
                   therapy_plan_id AS "therapyPlanId",
                   session_number AS "sessionNumber", session_date AS "sessionDate", status, notes,
                   activities, progress, supervisor_feedback AS "supervisorFeedback"`,
        [
          Number(patientId),
          patientName,
          req.user.username,
          Number(therapyPlanId),
          Number(sessionNumber),
          sessionDate || null,
          notes || null,
          JSON.stringify(activitiesValue),
          progress || null,
        ]
      );

      const session = upsert.rows[0];
      const actor = parseAuthUser(req);
      const activity = await logActivity(db, {
        actorUserId: actor?.id,
        actorUsername: actor?.username || req.body?.actorUsername,
        actionType: "session_completed",
        entityType: "session",
        entityId: session.id,
        message: `Session ${session.sessionNumber} completed for ${session.patientName}`,
        metadata: { patientName: session.patientName },
      });

      await createNotification(db, {
        type: "approved",
        message: `Session ${session.sessionNumber} completed for ${session.patientName}`,
        activityId: activity.id,
      });

      res.json({ session, activity });
    })
  );
};
