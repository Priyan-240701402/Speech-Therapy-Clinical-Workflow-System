const normalizeValue = (value) => (value || "").trim().toLowerCase();

const therapistDisplayNameByUsername = new Map([
  ["emily_therapist", "Dr. Emily Roberts"],
  ["james_therapist", "Dr. James Wilson"],
  ["sarah_therapist", "Dr. Sarah Anderson"],
  ["michael_therapist", "Dr. Michael Thompson"],
  ["therapist01", "Dr. Emily Roberts"],
  ["therapist02", "Dr. James Wilson"],
  ["therapist03", "Dr. Sarah Anderson"],
  ["therapist04", "Dr. Michael Thompson"],
]);

const therapistUsernameAliases = new Map([
  ["therapist01", "emily_therapist"],
  ["therapist02", "james_therapist"],
  ["therapist03", "sarah_therapist"],
  ["therapist04", "michael_therapist"],
]);

const isTherapistAssignmentMatch = (assignedTherapist, username) => {
  const assigned = normalizeValue(assignedTherapist);
  const user = normalizeValue(username);
  if (!assigned || !user) return false;
  if (assigned === user) return true;
  const alias = therapistUsernameAliases.get(user);
  if (alias && normalizeValue(alias) === assigned) return true;
  const inverseAlias = therapistUsernameAliases.get(assigned);
  if (inverseAlias && normalizeValue(inverseAlias) === user) return true;
  const displayName = therapistDisplayNameByUsername.get(user);
  if (displayName && normalizeValue(displayName) === assigned) return true;
  return false;
};

const ensureTherapistAssigned = async (db, patientId, username) => {
  const result = await db.query(
    "SELECT id, name, assigned_therapist AS \"assignedTherapist\" FROM patients WHERE id = $1",
    [Number(patientId)]
  );
  const patient = result.rows[0];
  if (!patient) {
    return { ok: false, reason: "Patient not found" };
  }

  if (isTherapistAssignmentMatch(patient.assignedTherapist, username)) {
    return { ok: true, patient };
  }

  const userResult = await db.query(
    "SELECT username, display_name AS \"displayName\" FROM users WHERE username = $1",
    [username]
  );
  const currentUser = userResult.rows[0];
  if (currentUser) {
    const assigned = normalizeValue(patient.assignedTherapist);
    const displayName = normalizeValue(currentUser.displayName);
    if (displayName && assigned === displayName) {
      return { ok: true, patient };
    }
  }

  return { ok: false, reason: "Therapist not assigned to this patient" };
};

export {
  ensureTherapistAssigned,
  isTherapistAssignmentMatch,
  normalizeValue,
  therapistDisplayNameByUsername,
  therapistUsernameAliases,
};
