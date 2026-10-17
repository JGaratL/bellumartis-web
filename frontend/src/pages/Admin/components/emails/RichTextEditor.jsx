import { useEffect, useRef } from "react";
import { sanitizeEmailHtml } from "../../../../utils/htmlSanitizers";

export default function RichTextEditor({
  value = "",
  onChange,
}) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (
      editorRef.current &&
      editorRef.current.innerHTML !== value
    ) {
      editorRef.current.innerHTML = sanitizeEmailHtml(value);
    }
  }, [value]);

  const handleInput = () => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, commandValue = null) => {
    editorRef.current?.focus();

    document.execCommand(
      command,
      false,
      commandValue
    );

    handleInput();
  };

  return (
    <div className="admin-rich-text-editor">

      {/* =======================
          BARRA DE HERRAMIENTAS
      ======================== */}

      <div className="admin-rich-text-toolbar">

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand("bold");
          }}
          title="Negrita"
        >
          <strong>B</strong>
        </button>


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand("italic");
          }}
          title="Cursiva"
        >
          <em>I</em>
        </button>


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand("underline");
          }}
          title="Subrayado"
        >
          <u>U</u>
        </button>


        <span className="admin-rich-text-divider" />


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand(
              "formatBlock",
              "<h2>"
            );
          }}
          title="Título"
        >
          H2
        </button>


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand(
              "formatBlock",
              "<h3>"
            );
          }}
          title="Subtítulo"
        >
          H3
        </button>


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand(
              "formatBlock",
              "<p>"
            );
          }}
          title="Párrafo"
        >
          P
        </button>


        <span className="admin-rich-text-divider" />


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand("insertUnorderedList");
          }}
          title="Lista"
        >
          • Lista
        </button>


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand("insertOrderedList");
          }}
          title="Lista numerada"
        >
          1. Lista
        </button>


        <span className="admin-rich-text-divider" />


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            const url = window.prompt(
              "Introduce la URL:"
            );

            if (url) {
              execCommand(
                "createLink",
                url
              );
            }
          }}
          title="Enlace"
        >
          🔗
        </button>


        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            execCommand("removeFormat");
          }}
          title="Limpiar formato"
        >
          Tx
        </button>

      </div>


      {/* =======================
          ÁREA DE EDICIÓN
      ======================== */}

      <div
        ref={editorRef}
        className="admin-rich-text-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder="Escribe el contenido del email..."
      />

    </div>
  );
}
