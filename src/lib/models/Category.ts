import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId | null;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: Date;
}

const CategorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  name: { type: String, required: true },
  color: { type: String, default: "#4C8DFF" },
  icon: { type: String, default: "folder" },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
