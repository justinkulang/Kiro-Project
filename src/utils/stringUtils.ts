/**
 * Generate a random string of specified length using the provided character set
 */
export function generateRandomString(length: number, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate a random alphanumeric string (uppercase letters and numbers)
 */
export function generateAlphanumeric(length: number): string {
  return generateRandomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
}

/**
 * Generate a random numeric string
 */
export function generateNumeric(length: number): string {
  return generateRandomString(length, '0123456789');
}

/**
 * Generate a random alphabetic string (lowercase)
 */
export function generateAlphabetic(length: number): string {
  return generateRandomString(length, 'abcdefghijklmnopqrstuvwxyz');
}

/**
 * Sanitize string for use in filenames or codes
 */
export function sanitizeString(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate string to specified length with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Generate a unique identifier
 */
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}