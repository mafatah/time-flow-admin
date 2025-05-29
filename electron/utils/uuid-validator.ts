
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateAndGetUUID(value: string, fallbackUUID: string): string {
  if (isValidUUID(value)) {
    return value;
  }
  
  console.warn(`Invalid UUID detected: ${value}, using fallback: ${fallbackUUID}`);
  return fallbackUUID;
}

export function generateDefaultProjectUUID(): string {
  // Default project UUID for fallback
  return '00000000-0000-0000-0000-000000000001';
}
