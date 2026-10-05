export type FileKind = 'pdf' | 'docx' | 'txt' | 'text';

// Viewer kind from the original file name
export function fileKind(fileName?: string): FileKind {
  const ext = fileName?.toLowerCase().split('.').pop();
  return ext === 'pdf' || ext === 'docx' || ext === 'txt' ? ext : 'text';
}

// Students delete only their own uploads
export function canDeleteManuscript(
  ms: { uploadedBy: string },
  user: { role: string; username: string },
): boolean {
  return user.role === 'admin' || ms.uploadedBy === user.username;
}
