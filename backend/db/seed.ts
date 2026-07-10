import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

function getSetupUrl(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL in backend/.env");
  return url;
}

async function seed() {
  const pool = new pg.Pool({ connectionString: getSetupUrl() });

  async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>> {
    return pool.query<T>(text, params);
  }

  console.log("Seeding database...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const studentHash = await bcrypt.hash("student123", 10);

  // Admin user
  const adminUser = await q<{ id: string }>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ["admin@studentlink.local", adminHash],
  );

  // Alex Morgan student
  const alexUser = await q<{ id: string }>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'student')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ["alex.morgan@stanford.edu", studentHash],
  );

  const alexStudent = await q<{ id: string }>(
    `INSERT INTO students (
      user_id, username, name, title, university, major, graduation_year,
      bio, location, github, linkedin, portfolio, phone,
      profile_views, nfc_taps, resume_downloads
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (username) DO UPDATE SET
       name = EXCLUDED.name,
       bio = EXCLUDED.bio,
       updated_at = NOW()
     RETURNING id`,
    [
      alexUser.rows[0].id,
      "alex-morgan",
      "Alex Morgan",
      "Software Engineer",
      "Stanford University",
      "Computer Science",
      2025,
      "Full-stack developer passionate about building products that make a difference. Experienced in React, Node.js, and machine learning.",
      "Palo Alto, CA",
      "https://github.com/alexmorgan",
      "https://linkedin.com/in/alexmorgan",
      "https://alexmorgan.dev",
      "+1 (650) 555-0142",
      342,
      89,
      47,
    ],
  );

  const studentId = alexStudent.rows[0].id;

  // Clear existing seed data for alex
  await q(`DELETE FROM projects WHERE student_id = $1`, [studentId]);
  await q(`DELETE FROM skills WHERE student_id = $1`, [studentId]);
  await q(`DELETE FROM certificates WHERE student_id = $1`, [studentId]);
  await q(`DELETE FROM experience WHERE student_id = $1`, [studentId]);
  await q(`DELETE FROM resumes WHERE student_id = $1`, [studentId]);

  const projects = [
    ["Campus Events Platform", "Full-stack event management system serving 5,000+ students", ["React", "Node.js", "PostgreSQL"], "https://github.com/alexmorgan/campus-events", true],
    ["ML Study Assistant", "AI-powered study tool using GPT-4 for personalized learning", ["Python", "FastAPI", "OpenAI"], "https://github.com/alexmorgan/ml-study", true],
    ["Real-time Chat App", "WebSocket-based messaging with end-to-end encryption", ["TypeScript", "Socket.io", "Redis"], "https://github.com/alexmorgan/chat-app", false],
  ];

  for (let i = 0; i < projects.length; i++) {
    const [title, description, tech, url, featured] = projects[i];
    await q(
      `INSERT INTO projects (student_id, title, description, tech, url, featured, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [studentId, title, description, tech, url, featured, i],
    );
  }

  const skills = [
    ["React", 90, "Frontend"],
    ["TypeScript", 85, "Frontend"],
    ["Node.js", 80, "Backend"],
    ["Python", 75, "Backend"],
    ["PostgreSQL", 70, "Database"],
    ["AWS", 65, "Cloud"],
    ["Figma", 60, "Design"],
    ["Machine Learning", 55, "AI/ML"],
  ];

  for (let i = 0; i < skills.length; i++) {
    const [name, level, category] = skills[i];
    await q(
      `INSERT INTO skills (student_id, name, level, category, sort_order) VALUES ($1, $2, $3, $4, $5)`,
      [studentId, name, level, category, i],
    );
  }

  const certs = [
    ["AWS Solutions Architect Associate", "Amazon Web Services", "2024-08"],
    ["Google Cloud Professional Developer", "Google", "2024-03"],
    ["Meta Front-End Developer", "Meta", "2023-11"],
  ];

  for (let i = 0; i < certs.length; i++) {
    const [name, issuer, date] = certs[i];
    await q(
      `INSERT INTO certificates (student_id, name, issuer, issued_date, sort_order) VALUES ($1, $2, $3, $4, $5)`,
      [studentId, name, issuer, date, i],
    );
  }

  const exps = [
    ["Software Engineering Intern", "Stripe", "Summer 2024", "Built payment dashboard features used by 10K+ merchants"],
    ["Research Assistant", "Stanford AI Lab", "2023 – Present", "Contributing to NLP research on document understanding"],
  ];

  for (let i = 0; i < exps.length; i++) {
    const [role, company, period, description] = exps[i];
    await q(
      `INSERT INTO experience (student_id, role, company, period, description, sort_order) VALUES ($1, $2, $3, $4, $5, $6)`,
      [studentId, role, company, period, description, i],
    );
  }

  await q(
    `INSERT INTO resumes (student_id, file_name, file_size_bytes, version, is_active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [studentId, "Alex_Morgan_Resume_2025.pdf", 250880, 3],
  );

  await q(
    `INSERT INTO nfc_cards (card_number, student_id, status, total_taps)
     VALUES ($1, $2, 'active', $3)
     ON CONFLICT (card_number) DO UPDATE SET student_id = EXCLUDED.student_id`,
    ["SL-2025-0042", studentId, 89],
  );

  // Sarah Chen
  const sarahUser = await q<{ id: string }>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'student')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ["sarah.chen@mit.edu", studentHash],
  );

  const sarahStudent = await q<{ id: string }>(
    `INSERT INTO students (
      user_id, username, name, title, university, major, bio,
      github, linkedin, portfolio, phone, profile_views
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [
      sarahUser.rows[0].id,
      "sarah-chen",
      "Sarah Chen",
      "Electrical Engineer",
      "MIT",
      "Electrical Engineering",
      "Hardware engineer specializing in embedded systems and IoT.",
      "https://github.com/sarahchen",
      "https://linkedin.com/in/sarahchen",
      "https://sarahchen.dev",
      "+1 (617) 555-0198",
      521,
    ],
  );

  const sarahId = sarahStudent.rows[0].id;
  await q(`DELETE FROM projects WHERE student_id = $1`, [sarahId]);
  await q(
    `INSERT INTO projects (student_id, title, description, tech, url, featured, sort_order)
     VALUES ($1, $2, $3, $4, $5, TRUE, 0)`,
    [sarahId, "Smart Home Hub", "IoT central controller with voice integration", ["C++", "ESP32", "MQTT"], "#"],
  );

  // Universities
  const unis = ["Stanford University", "MIT", "UC Berkeley", "Georgia Tech"];
  for (const name of unis) {
    await q(
      `INSERT INTO universities (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name],
    );
  }

  // Pre-registered student for Google name-claim demo (no login yet)
  await q(
    `INSERT INTO students (username, name, university, major, status, user_id)
     VALUES ($1, $2, $3, $4, 'pending', NULL)
     ON CONFLICT (username) DO NOTHING`,
    ["james-wilson", "JAMES WILSON", "UC Berkeley", "Data Science"],
  );

  console.log("Seed complete.");
  console.log("  Admin:   admin@studentlink.local / admin123");
  console.log("  Student: alex.morgan@stanford.edu / student123");
  console.log("  Student: sarah.chen@mit.edu / student123");
  console.log("  Google claim demo: pre-registered JAMES WILSON (no account yet)");
  console.log("  Admin user id:", adminUser.rows[0].id);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
