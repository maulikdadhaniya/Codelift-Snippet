import mongoose from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser extends mongoose.Document {
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  role: UserRole;
  isRevoked: boolean;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    mobile: { type: String, trim: true, maxlength: 20 },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
