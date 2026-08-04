import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  pinHash: string;
  recoveryCodeHash?: string;
  autoLockSeconds: number;
  lastUnlockAt?: Date;
  failedAttempts: number;
  lockoutUntil?: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true, default: "User" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  pinHash: { type: String, required: true },
  recoveryCodeHash: { type: String, default: "" },
  autoLockSeconds: { type: Number, default: 60 },
  lastUnlockAt: { type: Date, default: null },
  failedAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
