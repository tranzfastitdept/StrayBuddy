// lib/media/compressImage.ts
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.25, // < 250KB limit to respect Supabase free-tier 1GB storage
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch (error) {
    console.warn("Client-side compression failed or unsupported, using original file:", error);
    return file;
  }
}
