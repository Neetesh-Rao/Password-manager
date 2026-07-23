import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminAuth extends Document {
  pinHash: string;
  recoveryCodeHash: string;
  autoLockSeconds: number;
  lastUnlockAt: Date | null;
  failedAttempts: number;
  lockoutUntil: Date | null;
  createdAt: Date;
}

const AdminAuthSchema: Schema = new Schema({
  pinHash: { type: String, required: true },
  recoveryCodeHash: { type: String, required: true },
  autoLockSeconds: { type: Number, default: 60 },
  lastUnlockAt: { type: Date, default: null },
  failedAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const AdminAuth: Model<IAdminAuth> =
  mongoose.models.AdminAuth || mongoose.model<IAdminAuth>("AdminAuth", AdminAuthSchema);

export default AdminAuth;
