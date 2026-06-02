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

export default function UserActions({ onView, onEdit, onBlock, onDelete }) {
  return (
    <div className="admin-actions">
      <ActionButton label="Ver usuario" icon={RiEyeLine} onClick={onView} />
      <ActionButton label="Editar usuario" icon={RiPencilLine} onClick={onEdit} />
      <ActionButton
        label="Bloquear usuario"
        icon={RiProhibitedLine}
        onClick={onBlock}
      />
      <ActionButton
        label="Eliminar usuario"
        icon={RiDeleteBinLine}
        onClick={onDelete}
        danger
      />
    </div>
  );
}
