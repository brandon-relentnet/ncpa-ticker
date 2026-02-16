/**
 * Copy text to the clipboard using the modern Clipboard API.
 * Returns true on success, false on failure.
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
