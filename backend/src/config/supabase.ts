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
  const filePath = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // Ensure bucket exists or handle error silently
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError && bucketError.message.includes('not found')) {
    await supabase.storage.createBucket(bucketName, { public: true });
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
