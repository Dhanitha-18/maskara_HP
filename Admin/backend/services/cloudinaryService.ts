import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dvh2z69zx';
const API_KEY = process.env.CLOUDINARY_API_KEY || '679124576356784';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'x_Q1mFzL49kO54gHs867j9K_L80';

let cloudinarySDK: any = null;
try {
  const { v2 } = require('cloudinary');
  v2.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true
  });
  cloudinarySDK = v2;
} catch (err) {
  console.warn('Notice: Cloudinary SDK optional module load exception, using native HTTP uploader.');
}

/**
 * Uploads a Multer file to Cloudinary and deletes any local temporary file.
 * Returns the permanent secure Cloudinary HTTPS URL.
 */
export const uploadImageToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'hostel_management'
): Promise<{ imageUrl: string; publicId?: string }> => {
  try {
    // Attempt via Cloudinary SDK if available
    if (cloudinarySDK) {
      if (file.path && fs.existsSync(file.path)) {
        const result = await cloudinarySDK.uploader.upload(file.path, {
          folder,
          resource_type: 'auto'
        });
        try { fs.unlinkSync(file.path); } catch {}
        return { imageUrl: result.secure_url, publicId: result.public_id };
      } else if (file.buffer) {
        const result: any = await new Promise((resolve, reject) => {
          const stream = cloudinarySDK.uploader.upload_stream(
            { folder, resource_type: 'auto' },
            (error: any, res: any) => {
              if (error) return reject(error);
              resolve(res);
            }
          );
          stream.end(file.buffer);
        });
        return { imageUrl: result.secure_url, publicId: result.public_id };
      }
    }

    // Direct HTTP API upload fallback
    const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch {}
    }

    if (buffer) {
      const mimeType = file.mimetype || 'image/jpeg';
      const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
      
      const formData = new FormData();
      formData.append('file', base64Data);
      formData.append('upload_preset', 'unsigned_preset');
      formData.append('folder', folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const json: any = await res.json();
        if (json.secure_url) {
          return { imageUrl: json.secure_url, publicId: json.public_id };
        }
      }

      // If unsigned upload fails, return base64 Data URI directly
      return { imageUrl: base64Data };
    }

    throw new Error('No valid file buffer or path found for upload');
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch {}
    }

    if (file.buffer) {
      const mimeType = file.mimetype || 'image/jpeg';
      return { imageUrl: `data:${mimeType};base64,${file.buffer.toString('base64')}` };
    }
    throw error;
  }
};

export const deleteFromCloudinary = async (publicIdOrUrl: string): Promise<boolean> => {
  if (!publicIdOrUrl || !cloudinarySDK) return false;
  try {
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
      const parts = publicIdOrUrl.split('/upload/');
      if (parts.length > 1) {
        const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
        publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.')) || pathAfterUpload;
      }
    }
    const result = await cloudinarySDK.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch {
    return false;
  }
};
