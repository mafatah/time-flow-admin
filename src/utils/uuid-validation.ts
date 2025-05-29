
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateProjectId(projectId: string | null): string | null {
  if (!projectId) return null;
  if (isValidUUID(projectId)) return projectId;
  
  console.warn(`Invalid project ID format: ${projectId}`);
  return null;
}

export function validateUserId(userId: string | null): string | null {
  if (!userId) return null;
  if (isValidUUID(userId)) return userId;
  
  console.warn(`Invalid user ID format: ${userId}`);
  return null;
}
