/**
 * Copies `text` to the clipboard, falling back to the `document.execCommand`
 * path for browsers (or embedded/non-HTTPS contexts) where
 * `navigator.clipboard` is unavailable.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const succeeded = document.execCommand("copy");
    if (!succeeded) {
      throw new Error("execCommand('copy') was rejected by the browser");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
