import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICipherField {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface IPassword extends Document {
  title: string;
  passwordCipher: ICipherField;
  notesCipher: ICipherField | null;
  customFields: {
    label: string;
    valueCipher: ICipherField;
  }[];
  categoryId: mongoose.Types.ObjectId | null;
  url: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CipherFieldSchema = new Schema({
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
}, { _id: false });

const PasswordSchema: Schema = new Schema({
  title: { type: String, required: true },
  passwordCipher: { type: CipherFieldSchema, required: true },
  notesCipher: { type: CipherFieldSchema, default: null },
  customFields: [
    {
      label: { type: String, required: true },
      valueCipher: { type: CipherFieldSchema, required: true }
    }
  ],
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
  url: { type: String, default: "" },
  isFavorite: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Password: Model<IPassword> =
  mongoose.models.Password || mongoose.model<IPassword>("Password", PasswordSchema);

export default Password;
