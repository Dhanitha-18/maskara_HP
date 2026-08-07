import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://zumdfhransrerdyudbaf.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function uploadToSupabaseStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  bucketName = 'uploads'
): Promise<string> {
  try {
    const filePath = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Ensure bucket exists or handle error silently
    const { error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError && bucketError.message.includes('not found')) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (!error) {
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else {
      console.warn('Supabase storage upload warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase Storage exception, using data URL fallback:', err);
  }

  // Fallback to data URL if Supabase storage bucket is unconfigured
  const base64 = fileBuffer.toString('base64');
  return `data:${mimeType || 'image/jpeg'};base64,${base64}`;
}
