export const logActivity = async (db, activity) => {
  const {
    actorUserId,
    actorUsername,
    actionType,
    entityType,
    entityId,
    message,
    metadata,
  } = activity;

  const result = await db.query(
    `INSERT INTO activities
      (actor_user_id, actor_username, action_type, entity_type, entity_id, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, actor_user_id AS "actorUserId", actor_username AS "actorUsername",
               action_type AS "actionType", entity_type AS "entityType", entity_id AS "entityId",
               message, metadata, created_at AS "createdAt"`,
    [
      actorUserId || null,
      actorUsername || null,
      actionType,
      entityType,
      entityId || null,
      message,
      metadata ? JSON.stringify(metadata) : JSON.stringify({}),
    ]
  );

  return result.rows[0];
};

export const createNotification = async (db, notification) => {
  const { userId, type, message, activityId } = notification;
  const result = await db.query(
    `INSERT INTO notifications (user_id, type, message, activity_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id AS "userId", type, message, activity_id AS "activityId",
               is_read AS "isRead", created_at AS "createdAt"`,
    [userId || null, type, message, activityId || null]
  );
  return result.rows[0];
};

export const notifyRoles = async (db, roles, payload) => {
  const roleResult = await db.query(
    "SELECT id FROM users WHERE role = ANY($1::text[])",
    [roles]
  );
  const notifications = [];
  for (const row of roleResult.rows) {
    const item = await createNotification(db, {
      ...payload,
      userId: row.id,
    });
    notifications.push(item);
  }
  return notifications;
};
