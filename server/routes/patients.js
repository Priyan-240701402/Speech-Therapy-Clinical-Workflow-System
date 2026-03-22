import { getDb } from "../db.js";
import { requireAuth, requireRole } from "../middleware.js";
import { asyncHandler, parsePagination } from "../lib/http.js";
import { parseAuthUser } from "../lib/auth.js";
import { logActivity, createNotification, notifyRoles } from "../lib/activity.js";

export const registerPatientRoutes = (app, { dbPromise }) => {
  app.get("/patients", requireAuth, asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 25, maxLimit: 200 });
    await dbPromise;
    const db = getDb();
    const result = await db.query(
      `SELECT id, name, age, diagnosis, assigned_therapist AS "assignedTherapist", status
       FROM patients
       ORDER BY id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ patients: result.rows, pagination: { page, limit, offset } });
  }));

  app.post("/patients", asyncHandler(async (req, res) => {
    const { name, age, diagnosis, assignedTherapist } = req.body || {};

    if (!name || !age || !diagnosis) {
      return res.status(400).json({ error: "Missing required patient fields" });
    }

    await dbPromise;
    const db = getDb();

    const insert = await db.query(
      "INSERT INTO patients (name, age, diagnosis, assigned_therapist, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, age, diagnosis, assigned_therapist AS \"assignedTherapist\", status",
      [
        name,
        Number(age),
        diagnosis,
        assignedTherapist || "Unassigned",
        assignedTherapist && assignedTherapist !== "Unassigned" ? "active" : "pending",
      ]
    );

    const patient = insert.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "patient_created",
      entityType: "patient",
      entityId: patient.id,
      message: `Patient ${patient.name} created with status ${patient.status}`,
      metadata: { assignedTherapist: patient.assignedTherapist },
    });

    if (patient.status === "pending") {
      await notifyRoles(db, ["admin", "supervisor"], {
        type: "pending",
        message: "New patient allocation requires therapist assignment",
        activityId: activity.id,
      });
    }

    res.status(201).json({ patient, activity });
  }));

  app.patch(
    "/patients/:id/assign",
    requireAuth,
    requireRole(["admin", "supervisor"]),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { assignedTherapist } = req.body || {};

      if (!assignedTherapist) {
        return res.status(400).json({ error: "assignedTherapist is required" });
      }

      await dbPromise;
      const db = getDb();
      const update = await db.query(
        "UPDATE patients SET assigned_therapist = $1, status = 'active' WHERE id = $2 RETURNING id, name, age, diagnosis, assigned_therapist AS \"assignedTherapist\", status",
        [assignedTherapist, Number(id)]
      );

      if (!update.rows.length) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const patient = update.rows[0];
      const actor = parseAuthUser(req);
      const activity = await logActivity(db, {
        actorUserId: actor?.id,
        actorUsername: actor?.username || req.body?.actorUsername,
        actionType: "patient_assigned",
        entityType: "patient",
        entityId: patient.id,
        message: `Patient ${patient.name} assigned to ${patient.assignedTherapist}`,
        metadata: { assignedTherapist: patient.assignedTherapist },
      });

      await createNotification(db, {
        type: "approved",
        message: `Patient ${patient.name} assigned to ${patient.assignedTherapist}`,
        activityId: activity.id,
      });

      res.json({ patient, activity });
    })
  );

  app.get(
    "/therapists",
    requireAuth,
    requireRole(["admin", "supervisor"]),
    asyncHandler(async (req, res) => {
      const { limit, offset, page } = parsePagination(req, { limit: 50, maxLimit: 200 });
      await dbPromise;
      const db = getDb();
      const result = await db.query(
        `SELECT id, username, display_name AS "displayName", role
         FROM users
         WHERE role = 'therapist'
         ORDER BY username
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      res.json({ therapists: result.rows, pagination: { page, limit, offset } });
    })
  );

  app.patch("/patients/:id/status", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["active", "pending", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await dbPromise;
    const db = getDb();
    const update = await db.query(
      "UPDATE patients SET status = $1 WHERE id = $2 RETURNING id, name, age, diagnosis, assigned_therapist AS \"assignedTherapist\", status",
      [status, Number(id)]
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const patient = update.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "patient_status_updated",
      entityType: "patient",
      entityId: patient.id,
      message: `Patient ${patient.name} status updated to ${patient.status}`,
      metadata: { status: patient.status },
    });

    await createNotification(db, {
      type: "pending",
      message: `Patient ${patient.name} status updated to ${patient.status}`,
      activityId: activity.id,
    });

    res.json({ patient, activity });
  }));

  app.get("/session-plans", asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 25, maxLimit: 200 });
    await dbPromise;
    const db = getDb();
    const result = await db.query(
      `SELECT id,
              patient_id AS "patientId",
              patient_name AS "patientName",
              target_days AS "targetDays",
              status,
              start_date AS "startDate",
              created_at AS "createdAt"
       FROM session_plans
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ plans: result.rows, pagination: { page, limit, offset } });
  }));

  app.post("/session-plans", asyncHandler(async (req, res) => {
    const { patientId, patientName, targetDays, status, startDate } = req.body || {};
    if (!patientName || !patientId) {
      return res.status(400).json({ error: "patientId and patientName required" });
    }
    const allowed = ["active", "pending", "completed"];
    const planStatus = allowed.includes(status) ? status : "pending";

    await dbPromise;
    const db = getDb();
    const upsert = await db.query(
      `INSERT INTO session_plans (patient_id, patient_name, target_days, status, start_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (patient_id)
       DO UPDATE SET
         patient_name = EXCLUDED.patient_name,
         target_days = EXCLUDED.target_days,
         status = EXCLUDED.status,
         start_date = EXCLUDED.start_date
       RETURNING id,
                 patient_id AS "patientId",
                 patient_name AS "patientName",
                 target_days AS "targetDays",
                 status,
                 start_date AS "startDate",
                 created_at AS "createdAt"`,
      [
        Number(patientId),
        patientName,
        Number.isFinite(Number(targetDays)) ? Number(targetDays) : 0,
        planStatus,
        startDate || null,
      ]
    );

    const plan = upsert.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "session_plan_updated",
      entityType: "session_plan",
      entityId: plan.id,
      message: `Session plan updated for ${plan.patientName}`,
      metadata: { status: plan.status, targetDays: plan.targetDays },
    });

    if (planStatus === "completed") {
      await db.query("UPDATE patients SET status = 'completed' WHERE id = $1", [
        Number(patientId),
      ]);
    } else if (planStatus === "active") {
      await db.query("UPDATE patients SET status = 'active' WHERE id = $1", [
        Number(patientId),
      ]);
    }

    res.json({ plan, activity });
  }));

  app.get("/feedback", asyncHandler(async (req, res) => {
    const { limit, offset, page } = parsePagination(req, { limit: 25, maxLimit: 200 });
    await dbPromise;
    const db = getDb();
    const result = await db.query(
      `SELECT id,
              therapist_name AS "therapistName",
              supervisor_name AS "supervisorName",
              rating,
              strengths,
              areas_for_improvement AS "areasForImprovement",
              overall_comments AS "overallComments",
              patient_case AS "patientCase",
              created_at AS "createdAt"
       FROM feedback
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ feedback: result.rows, pagination: { page, limit, offset } });
  }));

  app.post("/feedback", asyncHandler(async (req, res) => {
    const {
      therapistName,
      supervisorName,
      rating,
      strengths,
      areasForImprovement,
      overallComments,
      patientCase,
    } = req.body || {};

    if (!therapistName || !supervisorName || !rating) {
      return res.status(400).json({ error: "therapistName, supervisorName, rating required" });
    }

    await dbPromise;
    const db = getDb();
    const insert = await db.query(
      `INSERT INTO feedback
        (therapist_name, supervisor_name, rating, strengths, areas_for_improvement, overall_comments, patient_case)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id,
                 therapist_name AS "therapistName",
                 supervisor_name AS "supervisorName",
                 rating,
                 strengths,
                 areas_for_improvement AS "areasForImprovement",
                 overall_comments AS "overallComments",
                 patient_case AS "patientCase",
                 created_at AS "createdAt"`,
      [
        therapistName,
        supervisorName,
        Number(rating),
        strengths || null,
        areasForImprovement || null,
        overallComments || null,
        patientCase || null,
      ]
    );

    const feedback = insert.rows[0];
    const actor = parseAuthUser(req);
    const activity = await logActivity(db, {
      actorUserId: actor?.id,
      actorUsername: actor?.username || req.body?.actorUsername,
      actionType: "feedback_submitted",
      entityType: "feedback",
      entityId: feedback.id,
      message: `Feedback submitted for ${feedback.therapistName}`,
      metadata: { rating: feedback.rating },
    });

    res.status(201).json({ feedback, activity });
  }));
};
