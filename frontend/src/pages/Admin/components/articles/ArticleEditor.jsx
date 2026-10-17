import { useEffect, useRef } from "react";
import { sanitizeArticleHtml } from "../../../../utils/htmlSanitizers";
import { FaBold, FaItalic, FaImage, FaLink, FaListOl, FaListUl, FaHeading } from "react-icons/fa6";

export default function ArticleEditor({
  value,
  onChange,
  onUploadImage,
  disabled,
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = value || "";
    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = sanitizeArticleHtml(nextValue);
    }
  }, [value]);

  const syncValue = () => {
    onChange(editorRef.current?.innerHTML || "");
  };

  const execCommand = (command, arg = null) => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, arg);
    syncValue();
  };

  const insertLink = () => {
    if (disabled) return;
    const url = window.prompt("Introduce la URL del enlace");
    if (!url) return;
    execCommand("createLink", url);
  };

  const handleImageFile = async (file) => {
    if (!file || disabled) return;

    try {
      const url = await onUploadImage(file);
      if (!url) return;

      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();
      document.execCommand("insertImage", false, url);
      syncValue();
    } catch (error) {
      console.error("ARTICLE INLINE IMAGE ERROR:", error);
      window.alert(error?.message || "No se pudo insertar la imagen");
    }
  };

  const openImagePicker = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="admin-article-editor-wrap">
      <div className="admin-article-editor-toolbar">
        <button type="button" className="admin-article-editor-btn" onClick={() => execCommand("bold")} disabled={disabled}>
          <FaBold />
          <span>Negrita</span>
        </button>

        <button type="button" className="admin-article-editor-btn" onClick={() => execCommand("italic")} disabled={disabled}>
          <FaItalic />
          <span>Cursiva</span>
        </button>

        <button type="button" className="admin-article-editor-btn" onClick={() => execCommand("formatBlock", "H2")} disabled={disabled}>
          <FaHeading />
          <span>H2</span>
        </button>

        <button type="button" className="admin-article-editor-btn" onClick={() => execCommand("formatBlock", "H3")} disabled={disabled}>
          <FaHeading />
          <span>H3</span>
        </button>

        <button type="button" className="admin-article-editor-btn" onClick={() => execCommand("insertUnorderedList")} disabled={disabled}>
          <FaListUl />
          <span>Lista</span>
        </button>

        <button type="button" className="admin-article-editor-btn" onClick={() => execCommand("insertOrderedList")} disabled={disabled}>
          <FaListOl />
          <span>Lista numerada</span>
        </button>

        <button type="button" className="admin-article-editor-btn" onClick={insertLink} disabled={disabled}>
          <FaLink />
          <span>Enlace</span>
        </button>

        <button type="button" className="admin-article-editor-btn" onClick={openImagePicker} disabled={disabled}>
          <FaImage />
          <span>Imagen</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="admin-article-editor-file"
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          handleImageFile(file);
        }}
      />

      <div
        ref={editorRef}
        className="admin-article-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={syncValue}
        onBlur={syncValue}
        role="textbox"
        aria-multiline="true"
        data-placeholder="Escribe aquí el contenido del artículo..."
      />
    </div>
  );
}
