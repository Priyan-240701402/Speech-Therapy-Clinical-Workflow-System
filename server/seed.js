import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { initDb, getDb } from "./db.js";

dotenv.config();

const seedUsers = [
  { username: "admin01", password: "Admin@123", role: "admin", displayName: "System Admin" },
  {
    username: "emily_therapist",
    password: "Therapist@1",
    role: "therapist",
    displayName: "Dr. Emily Roberts",
  },
  {
    username: "james_therapist",
    password: "Therapist@2",
    role: "therapist",
    displayName: "Dr. James Wilson",
  },
  {
    username: "sarah_therapist",
    password: "Therapist@3",
    role: "therapist",
    displayName: "Dr. Sarah Anderson",
  },
  {
    username: "michael_therapist",
    password: "Therapist@4",
    role: "therapist",
    displayName: "Dr. Michael Thompson",
  },
  {
    username: "supervisor01",
    password: "Supervisor@123",
    role: "supervisor",
    displayName: "Clinical Supervisor",
  },
];

const SALT_ROUNDS = 10;

const run = async () => {
  await initDb();
  const db = getDb();
  for (const user of seedUsers) {
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [user.username]
    );
    if (existing.rows.length > 0) {
      continue;
    }
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
    await db.query(
      "INSERT INTO users (username, display_name, password_hash, role) VALUES ($1, $2, $3, $4)",
      [user.username, user.displayName || null, passwordHash, user.role]
    );
  }

  const samplePatients = [
    {
      name: "Sarah Johnson",
      age: 7,
      diagnosis: "Articulation Disorder",
      assignedTherapist: "emily_therapist",
      status: "active",
    },
    {
      name: "Michael Chen",
      age: 5,
      diagnosis: "Language Delay",
      assignedTherapist: "james_therapist",
      status: "active",
    },
  ];

  for (const patient of samplePatients) {
    const existingPatient = await db.query(
      "SELECT id FROM patients WHERE name = $1 AND age = $2",
      [patient.name, patient.age]
    );
    if (existingPatient.rows.length > 0) {
      continue;
    }
    await db.query(
      "INSERT INTO patients (name, age, diagnosis, assigned_therapist, status) VALUES ($1, $2, $3, $4, $5)",
      [
        patient.name,
        patient.age,
        patient.diagnosis,
        patient.assignedTherapist,
        patient.status,
      ]
    );
  }

  console.log("Seed complete");
  await db.end();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
