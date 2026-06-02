import RoleBadge from "./RoleBadge";
import UserActions from "./UserActions";
import {
  formatDate,
  getLocation,
} from "../../utils/adminHelpers";

export default function UsersTable({ users, loading, onOpenDeleteUser }) {
  if (loading) {
    return <p className="admin-table-loading">Cargando usuarios...</p>;
  }

  if (!users.length) {
    return <p className="admin-table-empty">No hay usuarios para mostrar.</p>;
  }

  return (
    <table className="admin-users-table">
      <thead>
        <tr>
          <th>Nickname</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Ubicacion</th>
          <th>Registro</th>
          <th>Ultimo Login</th>
          <th>Posts</th>
          <th>Acciones</th>
        </tr>
      </thead>

      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>
              <span className="admin-strong-cell">{user.nickname}</span>
            </td>
            <td>{user.email}</td>
            <td>
              <RoleBadge role={user.role} />
            </td>
            <td>{getLocation(user)}</td>
            <td>{formatDate(user.created_at)}</td>
            <td>{formatDate(user.last_login)}</td>
            <td className="admin-posts-cell">{user.posts_count ?? ""}</td>
            <td>
              <UserActions onDelete={() => onOpenDeleteUser(user)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
