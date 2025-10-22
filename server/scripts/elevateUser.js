import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import User from "../models/User.js";

// Load env from server/.env explicitly to work when run from project root
dotenv.config();
if (!process.env.MONGO_URI) {
  try {
    const envPathUrl = new URL("../.env", import.meta.url);
    const envPath = fileURLToPath(envPathUrl);
    dotenv.config({ path: envPath });
  } catch (_) {}
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email" && argv[i + 1]) {
      out.email = argv[i + 1];
      i++;
    } else if (a === "--username" && argv[i + 1]) {
      out.username = argv[i + 1];
      i++;
    }
  }
  return out;
}
const argv = parseArgs(process.argv);
if (!argv.email && !argv.username) {
  console.error("Usage: node server/scripts/elevateUser.js --email <email> | --username <username>");
  process.exit(1);
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set in environment");
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected to MongoDB");

  const query = argv.email ? { email: argv.email } : { username: argv.username };
  const user = await User.findOne(query);
  if (!user) {
    console.error("User not found for", query);
    process.exit(1);
  }

  // Elevate privileges and permissions
  user.privilege = "admin";
  user.position = "Developer";
  user.isVerified = true;
  user.permissions = {
    ...(user.permissions || {}),
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canManageAnnouncements: true,
  };

  await user.save();
  console.log("User elevated:", {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    privilege: user.privilege,
    position: user.position,
    permissions: user.permissions,
    isVerified: user.isVerified,
  });

  await mongoose.disconnect();
  console.log("Disconnected");
}

run().catch((err) => {
  console.error("Elevate user error:", err);
  process.exit(1);
});
