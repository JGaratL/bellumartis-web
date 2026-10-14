import { useEffect, useRef } from "react";

export default function AdminImageField({
  id,
  label,
  description,
  previewUrl,
  fileName,
  buttonLabel = "Seleccionar imagen",
  clearLabel = "Quitar imagen",
  onFileChange,
  onClear,
  accept = "image/*",
  disabled = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl && String(previewUrl).startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const hasPreview = Boolean(previewUrl);

  return (
    <div className="admin-image-field">
      <div className="admin-image-field-head">
        <div>
          <p className="admin-image-field-label">{label}</p>
          {description ? <p className="admin-image-field-copy">{description}</p> : null}
        </div>

        <div className="admin-image-field-actions">
          <button
            type="button"
            className="admin-modal-btn secondary admin-image-field-btn"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            {hasPreview ? "Cambiar imagen" : buttonLabel}
          </button>

          {hasPreview && (
            <button
              type="button"
              className="admin-modal-btn secondary admin-image-field-btn"
              onClick={onClear}
              disabled={disabled}
            >
              {clearLabel}
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        id={id}
        className="admin-image-field-input"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          onFileChange?.(file);
          event.target.value = "";
        }}
        disabled={disabled}
      />

      {hasPreview ? (
        <div className="admin-image-preview-card">
          <img className="admin-image-preview" src={previewUrl} alt={label} />
          <div className="admin-image-preview-meta">
            <span className="admin-image-preview-title">{fileName || "Imagen seleccionada"}</span>
            <span className="admin-image-preview-copy">
              Puedes reemplazarla o quitarla antes de guardar.
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="admin-image-dropzone"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <span className="admin-image-dropzone-title">Subir imagen</span>
          <span className="admin-image-dropzone-copy">
            Selecciona un archivo JPG, PNG o WEBP desde tu equipo.
          </span>
        </button>
      )}
    </div>
  );
}
