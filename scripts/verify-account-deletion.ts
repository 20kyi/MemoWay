
import "dotenv/config";
import { db } from "../server/db";
import { users, members, groups } from "@shared/schema";
import { storage } from "../server/storage";
import { eq } from "drizzle-orm";

async function main() {
  console.log("========================================");
  console.log("[TEST] Starting Account Deletion Verification (With Group)");
  console.log("========================================");

  // 1. Create a test user
  const timestamp = Date.now();
  const email = `test-delete-group-${timestamp}@example.com`;
  const customId = `email_${email}`;

  const testUser = {
    id: customId,
    email: email,
    firstName: "Test User",
    lastName: "Group",
    passwordHash: "dummy_hash",
    provider: "email",
    points: 0,
  };

  console.log(`[TEST] Creating user: ${customId}`);
  await db.insert(users).values(testUser);

  // 2. Create a group and make user a member
  const groupName = `Test Group ${timestamp}`;
  const inviteCode = `INV${timestamp.toString().substring(7)}`;
  
  console.log(`[TEST] Creating group: ${groupName}`);
  const [group] = await db.insert(groups).values({
    name: groupName,
    inviteCode: inviteCode,
    color: "#000000",
    markerIcon: "default"
  }).returning();

  console.log(`[TEST] Adding user to group as MEMBER`);
  await db.insert(members).values({
    groupId: group.id,
    userId: customId,
    name: "Test Member",
    role: "member"
  });

  // Verify setup
  const userMembers = await storage.getMembersByGroupId(group.id);
  console.log(`[TEST] Group members count: ${userMembers.length}`);

  // 3. Perform deletion
  console.log(`[TEST] Calling storage.deleteUser(${customId})...`);
  try {
    await storage.deleteUser(customId);
    console.log("[TEST] storage.deleteUser executed successfully.");
  } catch (err) {
    console.error("[TEST] storage.deleteUser FAILED:", err);
    process.exit(1);
  }

  // 4. Verify deletion
  const checkUser = await storage.getUser(customId);
  const remainingMembers = await db.select().from(members).where(eq(members.userId, customId));
  
  console.log("========================================");
  if (checkUser) {
    console.error(`[FAIL] User STILL EXISTS!`);
  } else if (remainingMembers.length > 0) {
    console.error(`[FAIL] Member records remain!`);
  } else {
    console.log(`[PASS] User and member records successfully deleted.`);
  }
  console.log("========================================");
  process.exit(0);
}

main().catch(err => {
  console.error("[TEST] Unhandled error:", err);
  process.exit(1);
});
