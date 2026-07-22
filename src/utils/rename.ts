type PromptFn = (opts: {
  title?: string;
  label?: string;
  defaultValue?: string;
  confirmText?: string;
}) => Promise<string | null>;

/**
 * Prompt the user for a new file name, preserving the original extension.
 * Returns the new fileName (with extension) and a matching label heading,
 * or null if cancelled/unchanged.
 */
export async function renameFileName(
  prompt: PromptFn,
  currentName: string,
): Promise<{ fileName: string; heading: string } | null> {
  const dot = currentName.lastIndexOf('.');
  const ext = dot > 0 ? currentName.slice(dot) : '';
  const base = dot > 0 ? currentName.slice(0, dot) : currentName;

  const input = await prompt({
    title: 'Rename file',
    label: 'File name',
    defaultValue: base,
    confirmText: 'Rename',
  });
  if (input == null) return null;

  const trimmed = input.trim();
  if (!trimmed || trimmed === base) return null;

  const fileName = trimmed.toLowerCase().endsWith(ext.toLowerCase()) ? trimmed : trimmed + ext;
  return { fileName, heading: trimmed };
}
