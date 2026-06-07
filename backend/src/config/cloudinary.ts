import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary only if environment variables exist
const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'pchat'
): Promise<{ url: string; publicId: string } | null> => {
  if (!isConfigured) {
    // Return null to signify fallback to local file serving
    return null;
  }
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });
    // Delete file from local storage after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error, using local fallback:', error);
    return null;
  }
};
