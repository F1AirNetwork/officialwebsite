import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// ─── Configure lazily on first use ───────────
// Calling cloudinary.config() at module load time runs before dotenv,
// so env vars are undefined. Instead we configure inside each function.
const configure = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// ─── Upload a buffer to Cloudinary ────────────
// Returns { url, publicId }
export const uploadToCloudinary = (buffer, options = {}) => {
  configure();
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder:          "f1air/products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation:  [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ─── Delete an image from Cloudinary ──────────
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  configure();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
};

export default cloudinary;