import { UserRole } from '../types';

const MB = 1024 * 1024;

// Allowed file types and max size per role
export const UPLOAD_RULES: Record<UserRole, { extensions: string[]; maxBytes: number; label: string }> = {
  student: { extensions: ['.pdf', '.docx'], maxBytes: 10 * MB, label: 'PDF (.pdf) or Word (.docx)' },
  admin: { extensions: ['.pdf', '.txt'], maxBytes: 20 * MB, label: 'PDF (.pdf) or Plain Text (.txt)' },
};

// Returns an error message, or null if the file is valid
export function validateUpload(fileName: string, sizeBytes: number, role: UserRole): string | null {
  const rules = UPLOAD_RULES[role];
  const name = fileName.toLowerCase();
  if (!rules.extensions.some((ext) => name.endsWith(ext))) {
    return `Only ${rules.label} files are accepted.`;
  }
  if (sizeBytes > rules.maxBytes) {
    return `File is ${(sizeBytes / MB).toFixed(2)} MB. The maximum size is ${rules.maxBytes / MB} MB.`;
  }
  return null;
}

// Decoded byte size of a base64 string or data URL
export function base64ByteSize(data: string): number {
  const b64 = data.slice(data.indexOf(',') + 1);
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}
