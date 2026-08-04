import connectDB from "@/lib/mongodb";
import Password from "@/lib/models/Password";
import Category from "@/lib/models/Category";
import AdminAuth from "@/lib/models/AdminAuth";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";

/**
 * Ensures any passwords or custom categories created prior to multi-user implementation
 * are automatically migrated & linked to the primary user account so no credentials are lost.
 */
export async function migrateOrphanData(userId: string): Promise<{ passwordsMigrated: number }> {
  try {
    await connectDB();

    // 1. Assign orphan passwords (userId == null or doesn't exist) to target user
    const result = await Password.updateMany(
      { $or: [{ userId: null }, { userId: { $exists: false } }] },
      { $set: { userId } }
    );

    // 2. Assign orphan custom categories (userId == null and isDefault: false) to target user
    await Category.updateMany(
      { isDefault: false, $or: [{ userId: null }, { userId: { $exists: false } }] },
      { $set: { userId } }
    );

    return { passwordsMigrated: result.modifiedCount || 0 };
  } catch (error) {
    console.error("Data migration error:", error);
    return { passwordsMigrated: 0 };
  }
}

/**
 * Migration helper to convert legacy single-admin AdminAuth to User record if needed.
 */
export async function ensureLegacyAdminUser(): Promise<void> {
  try {
    await connectDB();
    const userCount = await User.countDocuments();
    const admin = await AdminAuth.findOne();

    if (userCount === 0) {
      if (admin && admin.pinHash) {
        const primaryUser = await User.create({
          name: "Abhishek Raj",
          email: "abhishek@vault.local",
          pinHash: admin.pinHash,
          recoveryCodeHash: admin.recoveryCodeHash || "",
          autoLockSeconds: admin.autoLockSeconds || 60,
        });

        await migrateOrphanData(primaryUser._id.toString());
      }
    } else {
      // Find users with missing required fields or missing pinHash
      const usersToRepair = await User.find({
        $or: [
          { name: { $exists: false } },
          { name: null },
          { name: "" },
          { pinHash: { $exists: false } },
          { pinHash: null },
          { pinHash: "" },
        ],
      });

      if (usersToRepair.length > 0) {
        for (const u of usersToRepair) {
          let updated = false;
          if (!u.name || !u.name.trim()) {
            u.name = u.email ? u.email.split("@")[0] : "Abhishek Raj";
            updated = true;
          }
          if (!u.email || !u.email.trim()) {
            u.email = "abhishek@vault.local";
            updated = true;
          }
          const legacyPinHash = u.pinHash || (u as any).pin_hash || admin?.pinHash;
          if (legacyPinHash && u.pinHash !== legacyPinHash) {
            u.pinHash = legacyPinHash;
            updated = true;
          }
          if (!u.recoveryCodeHash && admin?.recoveryCodeHash) {
            u.recoveryCodeHash = admin.recoveryCodeHash;
            updated = true;
          }
          if (updated) {
            await u.save();
          }
        }
      }
    }
  } catch (error) {
    console.error("Legacy admin conversion error:", error);
  }
}
