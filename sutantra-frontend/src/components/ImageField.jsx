import { useEffect, useMemo } from "react";

/**
 * Image picker with a live preview. Shows the currently stored image (or a
 * placeholder), lets the admin choose a replacement, and offers an optional
 * "remove current image" checkbox when an existing image is present.
 */
export default function ImageField({
  currentUrl = "",
  placeholder = "",
  file,
  onFile,
  removeImage = false,
  onRemoveImage
}) {
  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return currentUrl || placeholder || "";
  }, [file, currentUrl, placeholder]);

  useEffect(() => {
    return () => {
      if (file && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, previewUrl]);

  return (
    <div className="admin-image-field">
      <img className="admin-image-preview" src={previewUrl} alt="" />
      <div className="admin-image-controls">
        <label className="admin-file-btn">
          {file ? "Change image" : "Choose image"}
          <input
            type="file"
            aria-label="Choose image file"
            accept="image/webp,image/jpeg,image/png,image/gif"
            onChange={(event) => onFile(event.target.files?.[0] || null)}
          />
        </label>
        {file && <span className="admin-image-hint">Selected: {file.name}</span>}
        {currentUrl && onRemoveImage && !file && (
          <label className="admin-check">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(event) => onRemoveImage(event.target.checked)}
            />
            Remove current image
          </label>
        )}
        <span className="admin-image-hint">JPG, PNG, WEBP or GIF · up to 5 MB</span>
      </div>
    </div>
  );
}
