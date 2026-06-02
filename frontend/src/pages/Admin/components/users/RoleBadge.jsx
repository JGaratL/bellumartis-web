import { getRoleClass, ROLE_LABELS } from "../../utils/adminHelpers";

export default function RoleBadge({ role }) {
  return (
    <span className={`admin-role-badge ${getRoleClass(role)}`}>
      {ROLE_LABELS[role] || "User"}
    </span>
  );
}
