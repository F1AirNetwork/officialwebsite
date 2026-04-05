import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Category name is required"],
      trim:     true,
      unique:   true,
    },
    slug: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      // Emoji or icon identifier for UI display
      type:    String,
      default: "📦",
    },
    color: {
      // Tailwind color key used in admin badges e.g. "brand", "blue", "green"
      type:    String,
      default: "zinc",
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    sortOrder: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name
categorySchema.pre("save", function () {
  if (!this.isModified("name") || this.slug) return;
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
