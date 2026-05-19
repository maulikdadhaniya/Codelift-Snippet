/**
 * Sync static admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env.local to MongoDB.
 * Login also does this automatically — run only if you want to sync without signing in.
 *
 * Run: npm run seed-admin
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME?.trim() || "Admin";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME?.trim() || "User";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isRevoked: { type: Boolean, default: false },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

await mongoose.connect(MONGODB_URI);

const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
const existing = await User.findOne({ email: ADMIN_EMAIL }).select("+passwordHash");

if (existing) {
  existing.firstName = ADMIN_FIRST_NAME;
  existing.lastName = ADMIN_LAST_NAME;
  existing.role = "admin";
  existing.isRevoked = false;
  existing.passwordHash = passwordHash;
  await existing.save();
  console.log(`Synced static admin: ${ADMIN_EMAIL}`);
} else {
  await User.create({
    email: ADMIN_EMAIL,
    firstName: ADMIN_FIRST_NAME,
    lastName: ADMIN_LAST_NAME,
    role: "admin",
    isRevoked: false,
    passwordHash,
  });
  console.log(`Created static admin: ${ADMIN_EMAIL}`);
}

await mongoose.disconnect();
console.log("\nStatic admin login (from .env.local):");
console.log(`  Email:    ${ADMIN_EMAIL}`);
console.log(`  Password: (value of ADMIN_PASSWORD)`);
