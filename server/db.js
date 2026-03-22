import pg from "pg";

const { Pool } = pg;

const {
  DATABASE_URL,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
} = process.env;

const fallbackUser = DB_USER || "postgres";
const fallbackPassword = DB_PASSWORD || "12345";
const fallbackHost = DB_HOST || "localhost";
const fallbackPort = DB_PORT || "5432";
const fallbackName = DB_NAME || "speech_therapy";

const fallbackConnectionString = `postgres://${encodeURIComponent(
  fallbackUser
)}:${encodeURIComponent(fallbackPassword)}@${fallbackHost}:${fallbackPort}/${fallbackName}`;

const connectionString = DATABASE_URL || fallbackConnectionString;

const pool = new Pool({ connectionString });

export function getDb() {
  return pool;
}

export async function initDb() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'therapist', 'supervisor')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS display_name TEXT;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL CHECK (age > 0),
      diagnosis TEXT NOT NULL,
      assigned_therapist TEXT NOT NULL DEFAULT 'Unassigned',
      status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'completed')) DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      patient_name TEXT,
      patient_age INTEGER,
      diagnosis TEXT,
      therapist_name TEXT,
      sessions_completed INTEGER NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 0,
      initial_assessment TEXT,
      progress_notes TEXT,
      current_status TEXT,
      recommendations TEXT,
      supervisor_comment TEXT,
      status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'needs-revision')) DEFAULT 'draft',
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS patient_name TEXT,
      ADD COLUMN IF NOT EXISTS patient_age INTEGER,
      ADD COLUMN IF NOT EXISTS diagnosis TEXT,
      ADD COLUMN IF NOT EXISTS sessions_completed INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_sessions INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS initial_assessment TEXT,
      ADD COLUMN IF NOT EXISTS progress_notes TEXT,
      ADD COLUMN IF NOT EXISTS current_status TEXT,
      ADD COLUMN IF NOT EXISTS recommendations TEXT,
      ADD COLUMN IF NOT EXISTS supervisor_comment TEXT;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS therapy_plans (
      id SERIAL PRIMARY KEY,
      patient_name TEXT NOT NULL,
      goal TEXT NOT NULL,
      activities JSONB NOT NULL DEFAULT '[]'::jsonb,
      duration INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'changes-requested')) DEFAULT 'pending',
      therapist_name TEXT,
      supervisor_comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      patient_name TEXT NOT NULL,
      therapist_username TEXT,
      therapy_plan_id INTEGER REFERENCES therapy_plans(id) ON DELETE SET NULL,
      session_number INTEGER NOT NULL,
      session_date DATE,
      status TEXT NOT NULL CHECK (status IN ('completed', 'upcoming', 'in-progress')) DEFAULT 'upcoming',
      notes TEXT,
      activities JSONB NOT NULL DEFAULT '[]'::jsonb,
      progress TEXT,
      supervisor_feedback TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (patient_id, session_number)
    );
  `);

  await db.query(`
    ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS therapist_username TEXT,
      ADD COLUMN IF NOT EXISTS therapy_plan_id INTEGER REFERENCES therapy_plans(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS activities JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS progress TEXT,
      ADD COLUMN IF NOT EXISTS supervisor_feedback TEXT;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS session_plans (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL UNIQUE,
      patient_name TEXT NOT NULL,
      target_days INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'completed')) DEFAULT 'pending',
      start_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      therapist_name TEXT NOT NULL,
      supervisor_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      strengths TEXT,
      areas_for_improvement TEXT,
      overall_comments TEXT,
      patient_case TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_username TEXT,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      message TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_patients_status
      ON patients (status);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_reports_status
      ON reports (status);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_reports_due_date
      ON reports (due_date);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_reports_created_at
      ON reports (created_at);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_therapy_plans_status
      ON therapy_plans (status);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_patient_id
      ON sessions (patient_id);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_therapist_username
      ON sessions (therapist_username);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_session_date
      ON sessions (session_date);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_session_plans_status
      ON session_plans (status);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_feedback_created_at
      ON feedback (created_at);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_activities_created_at
      ON activities (created_at);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
      ON notifications (user_id, created_at);
  `);

  return db;
}
