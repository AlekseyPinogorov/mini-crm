// Creates the three demo users through the Auth admin API. Run before
// supabase/seed.sql, which references these fixed ids.
// The service key and passwords come only from the local .env.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

const seedUsers = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "manager@mini-crm.test",
    password: requireEnv("SEED_PASSWORD_MANAGER"),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "executor1@mini-crm.test",
    password: requireEnv("SEED_PASSWORD_EXECUTOR1"),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    email: "executor2@mini-crm.test",
    password: requireEnv("SEED_PASSWORD_EXECUTOR2"),
  },
];

const admin = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
).auth.admin;

for (const user of seedUsers) {
  const created = await admin.createUser({ ...user, email_confirm: true });
  if (!created.error) {
    console.log(`created ${user.email}`);
    continue;
  }
  // Re-running the script resets the password instead of failing.
  if (created.error.code !== "email_exists") throw created.error;
  const updated = await admin.updateUserById(user.id, {
    password: user.password,
  });
  if (updated.error) throw updated.error;
  console.log(`updated password for ${user.email}`);
}
