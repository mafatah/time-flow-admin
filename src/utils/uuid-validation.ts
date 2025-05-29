
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

export function validateProjectId(projectId: string | null | undefined): string | null {
  if (!projectId || typeof projectId !== 'string') {
    console.warn('Invalid project ID type:', typeof projectId, projectId);
    return null;
  }
  
  // Check for common invalid values
  if (projectId === 'activity-tracking' || projectId === 'proj-001' || projectId.length < 36) {
    console.warn('Invalid project ID format:', projectId);
    return null;
  }
  
  if (isValidUUID(projectId)) {
    return projectId;
  }
  
  console.warn(`Invalid project ID format: ${projectId}`);
  return null;
}

export function validateUserId(userId: string | null | undefined): string | null {
  if (!userId || typeof userId !== 'string') {
    console.warn('Invalid user ID type:', typeof userId, userId);
    return null;
  }
  
  // Check for common invalid values
  if (userId === 'activity-tracking' || userId === 'proj-001' || userId.length < 36) {
    console.warn('Invalid user ID format:', userId);
    return null;
  }
  
  if (isValidUUID(userId)) {
    return userId;
  }
  
  console.warn(`Invalid user ID format: ${userId}`);
  return null;
}

export function sanitizeUUID(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  
  // Remove any non-UUID characters and normalize
  const cleaned = value.trim().toLowerCase();
  
  if (isValidUUID(cleaned)) {
    return cleaned;
  }
  
  return null;
}
