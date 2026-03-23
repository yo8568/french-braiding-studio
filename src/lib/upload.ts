import { createClient } from "@/lib/supabase";

/**
 * Upload files to Supabase storage and return their public URLs.
 */
export async function uploadImages(
  files: File[],
  prefix = ""
): Promise<string[]> {
  const supabase = createClient();
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop();
    const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("work-images")
      .upload(path, file);
    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("work-images").getPublicUrl(path);
      urls.push(publicUrl);
    }
  }

  return urls;
}
