import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: Date;
}

const CategorySchema: Schema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: "#4C8DFF" },
  icon: { type: String, default: "folder" },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
