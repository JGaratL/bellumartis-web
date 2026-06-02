export default function EmailsSection({ title }) {
  return (
    <section className="admin-content">
      <div className="admin-card">
        <h3>{title}</h3>
        <p>
          Este espacio queda preparado para tus herramientas de gestion de{" "}
          {title.toLowerCase()}. Podemos conectar aqui tablas, filtros, edicion
          y acciones masivas cuando quieras.
        </p>
      </div>

      <div className="admin-card admin-card-soft">
        <p className="admin-stat-label">Estado actual</p>
        <p className="admin-stat-value">Seccion activa: {title}</p>
      </div>
    </section>
  );
}
