import { createClient } from "@/lib/supabase";

/**
 * Convert a File (image) to a JPEG Blob using canvas.
 */
function fileToJpeg(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("toBlob failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload files to Supabase storage and return their public URLs.
 * Images are converted to JPEG via canvas before uploading.
 */
export async function uploadImages(
  files: File[],
  prefix = ""
): Promise<string[]> {
  const supabase = createClient();
  const urls: string[] = [];

  for (const file of files) {
    const jpegBlob = await fileToJpeg(file);
    const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage
      .from("work-images")
      .upload(path, jpegBlob, { contentType: "image/jpeg" });
    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("work-images").getPublicUrl(path);
      urls.push(publicUrl);
    }
  }

  return urls;
}
