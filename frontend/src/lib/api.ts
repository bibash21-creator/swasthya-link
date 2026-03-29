/**
 * Utility to get and normalize the API URL.
 * It ensures no trailing slashes and the correct /api prefix.
 */
export const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  
  // Remove all trailing slashes
  url = url.replace(/\/+$/, "");
  
  // Ensure /api prefix if missing (required for the current backend structure)
  if (!url.endsWith("/api")) {
    url += "/api";
  }
  
  return url;
};

export const getUploadUrl = () => {
  let url = process.env.NEXT_PUBLIC_UPLOAD_URL || "http://localhost:8000";
  // Remove all trailing slashes
  return url.replace(/\/+$/, "");
};

/**
 * Join URL parts ensuring single slashes.
 */
export const joinUrl = (base: string, path: string) => {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
};
