import { readFile, unlink } from "fs/promises";
import path from "path";

export function resolveUploadPath(imageUrl: string): string {
  return path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
}

export function mimeForUploadPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

export async function readUploadAsDataUrl(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    const filePath = resolveUploadPath(imageUrl);
    const buf = await readFile(filePath);
    const mime = mimeForUploadPath(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function deleteUploadFile(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;
  try {
    await unlink(resolveUploadPath(imageUrl));
  } catch {
    // File may already be missing
  }
}

export async function uploadFileExists(imageUrl: string | null): Promise<boolean> {
  if (!imageUrl) return false;
  try {
    await readFile(resolveUploadPath(imageUrl));
    return true;
  } catch {
    return false;
  }
}
