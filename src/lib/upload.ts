import { createClient } from "@/lib/supabase";
import heic2any from "heic2any";

const HEIC_TYPES = ["image/heic", "image/heif"];

/**
 * Convert HEIC/HEIF file to a standard Blob that browsers can handle.
 */
async function convertHeic(file: File): Promise<Blob> {
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  return Array.isArray(blob) ? blob[0] : blob;
}

/**
 * Convert a File (image) to a JPEG Blob using canvas.
 */
function fileToJpeg(blob: Blob, quality = 0.85): Promise<Blob> {
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
        (result) => {
          if (result) resolve(result);
          else reject(new Error("toBlob failed"));
        },
        "image/jpeg",
        quality
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Upload files to Supabase storage and return their public URLs.
 * HEIC/HEIF files are first converted via heic2any, then all images
 * are converted to JPEG via canvas before uploading.
 */
export async function uploadImages(
  files: File[],
  prefix = ""
): Promise<string[]> {
  const supabase = createClient();
  const urls: string[] = [];

  for (const file of files) {
    const isHeic =
      HEIC_TYPES.includes(file.type) ||
      /\.(heic|heif)$/i.test(file.name);
    const source = isHeic ? await convertHeic(file) : file;
    const jpegBlob = await fileToJpeg(source);
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
