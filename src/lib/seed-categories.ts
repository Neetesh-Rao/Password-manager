/**
 * Seeds the default categories if none exist using Mongoose.
 */
import connectDB from "./mongodb";
import Category from "./models/Category";

const DEFAULT_CATEGORIES = [
  { name: "Social Media", color: "#4C8DFF", icon: "share-2" },
  { name: "Banking", color: "#D4AF6A", icon: "landmark" },
  { name: "Email", color: "#E45858", icon: "mail" },
  { name: "Work Tools", color: "#9B59B6", icon: "briefcase" },
  { name: "Shopping", color: "#4CD787", icon: "shopping-cart" },
  { name: "Entertainment", color: "#FF8C42", icon: "tv" },
  { name: "Others", color: "#8A8A8E", icon: "folder" },
];

export async function seedDefaultCategories(): Promise<void> {
  await connectDB();
  const count = await Category.countDocuments();
  if (count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await Category.create({
        ...cat,
        isDefault: true,
      });
    }
  }
}
