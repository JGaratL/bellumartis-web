import {
  RiDeleteBinLine,
  RiEyeLine,
  RiPencilLine,
  RiProhibitedLine,
} from "react-icons/ri";

function ActionButton({ label, icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`admin-action-btn ${danger ? "danger" : ""}`}
      aria-label={label}
      onClick={onClick}
      disabled={!onClick}
    >
      <Icon />
    </button>
  );
}

export default function EventActions({ onView, onEdit, onCancel, onDelete }) {
  return (
    <div className="admin-actions">
      <ActionButton label="Ver evento" icon={RiEyeLine} onClick={onView} />
      <ActionButton label="Editar evento" icon={RiPencilLine} onClick={onEdit} />
      <ActionButton
        label="Cancelar evento"
        icon={RiProhibitedLine}
        onClick={onCancel}
      />
      <ActionButton
        label="Eliminar evento"
        icon={RiDeleteBinLine}
        onClick={onDelete}
        danger
      />
    </div>
  );
}
