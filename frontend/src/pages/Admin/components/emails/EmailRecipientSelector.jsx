import { useEffect, useState } from "react";
import { SPAIN_PROVINCES } from "../../../../utils/spainProvinces";
import "./EmailRecipientSelector.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailRecipientSelector({
  value = {
    type: "users",
    recipients: [],
  },
  onChange,
  onPendingCustomEmailChange,
}) {
  const [email, setEmail] = useState("");

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");

  /*
   * =====================================
   * CARGAR USUARIOS
   * =====================================
   */

  useEffect(() => {
    if (value.type !== "users") {
      return;
    }

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        setUsersError("");

        const token = localStorage.getItem("token");

        if (!token) {
          setUsersError("No hay una sesión activa.");
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/admin/emails/users",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudieron cargar los usuarios."
          );
        }

        setUsers(data);
      } catch (error) {
        console.error("ERROR CARGANDO USUARIOS:", error);

        setUsersError(
          error.message || "No se pudieron cargar los usuarios."
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [value.type]);

  /*
   * =====================================
   * CAMBIAR TIPO DE DESTINATARIO
   * =====================================
   */

  const handleTypeChange = (event) => {
    const type = event.target.value;

    onChange({
      type,
      recipients: [],
    });

    setEmail("");
    onPendingCustomEmailChange?.("");
    setUserSearch("");
  };

  /*
   * =====================================
   * SELECCIONAR USUARIO
   * =====================================
   */

  const handleUserSelect = (user) => {
    const alreadyExists = value.recipients.some(
      (recipient) =>
        recipient.toLowerCase() ===
        user.email.toLowerCase()
    );

    if (alreadyExists) {
      return;
    }

    onChange({
      ...value,
      recipients: [
        ...value.recipients,
        user.email,
      ],
    });

    setUserSearch("");
  };

  /*
   * =====================================
   * AÑADIR EMAIL MANUAL
   * =====================================
   */

  const addCustomEmail = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return;
    }

    const alreadyExists = value.recipients.some(
      (recipient) =>
        recipient.toLowerCase() ===
        trimmedEmail.toLowerCase()
    );

    if (alreadyExists) {
      setEmail("");
      return;
    }

    onChange({
      ...value,
      recipients: [
        ...value.recipients,
        trimmedEmail,
      ],
    });

    setEmail("");
    onPendingCustomEmailChange?.("");
  };

  /*
   * =====================================
   * CAMBIAR PROVINCIA
   * =====================================
   */

  const handleProvinceChange = (event) => {
    const province = event.target.value;

    if (!province) {
      return;
    }

    onChange({
      type: "province",
      recipients: [province],
    });
  };

  /*
   * =====================================
   * ELIMINAR DESTINATARIO
   * =====================================
   */

  const removeRecipient = (index) => {
    onChange({
      ...value,
      recipients: value.recipients.filter(
        (_, recipientIndex) =>
          recipientIndex !== index
      ),
    });
  };

  /*
   * =====================================
   * RESULTADOS DE BÚSQUEDA
   * =====================================
   */

  const filteredUsers =
    userSearch.trim().length > 0
      ? users
          .filter((user) => {
            const search =
              userSearch.trim().toLowerCase();

            return (
              user.nickname
                ?.toLowerCase()
                .includes(search) ||
              user.email
                ?.toLowerCase()
                .includes(search)
            );
          })
          .filter(
            (user) =>
              !value.recipients.some(
                (recipient) =>
                  recipient.toLowerCase() ===
                  user.email.toLowerCase()
              )
          )
          .slice(0, 10)
      : [];

  return (
    <div className="admin-email-recipient-selector">

      {/* =======================
          TIPO DE DESTINATARIO
      ======================== */}

      <select
        className="admin-email-recipient-type"
        value={value.type}
        onChange={handleTypeChange}
      >
        <option value="users">
          Usuarios
        </option>

        <option value="all_users">
          Todos los usuarios
        </option>

        <option value="spain_users">
          Todos los usuarios de España
        </option>

        <option value="province">
          Usuarios de una provincia
        </option>

        <option value="newsletter">
          Suscriptores newsletter
        </option>

        <option value="custom">
          Direcciones concretas
        </option>
      </select>


      {/* =======================
          USUARIOS
      ======================== */}

      {value.type === "users" && (
        <div className="admin-email-users-selector">

          <input
            type="text"
            className="admin-email-recipient-input"
            value={userSearch}
            onChange={(event) =>
              setUserSearch(event.target.value)
            }
            placeholder="Buscar usuario por nombre o email..."
          />


          {/* =======================
              CARGANDO
          ======================== */}

          {loadingUsers && (
            <div className="admin-email-recipient-info">
              <span>⏳</span>

              <div>
                <strong>
                  Cargando usuarios...
                </strong>
              </div>
            </div>
          )}


          {/* =======================
              ERROR
          ======================== */}

          {usersError && (
            <div className="admin-email-recipient-info">
              <span>⚠️</span>

              <div>
                <strong>
                  Error
                </strong>

                <small>
                  {usersError}
                </small>
              </div>
            </div>
          )}


          {/* =======================
              RESULTADOS
          ======================== */}

          {!loadingUsers &&
            !usersError &&
            userSearch.trim() &&
            filteredUsers.length > 0 && (

              <div className="admin-email-users-list">

                {filteredUsers.map((user) => (

                  <button
                    type="button"
                    key={user.id}
                    className="admin-email-user-option"
                    onClick={() =>
                      handleUserSelect(user)
                    }
                  >

                    <span className="admin-email-user-avatar">
                      👤
                    </span>

                    <span className="admin-email-user-data">

                      <strong>
                        {user.nickname}
                      </strong>

                      <small>
                        {user.email}
                      </small>

                    </span>

                  </button>

                ))}

              </div>
            )}


          {/* =======================
              SIN RESULTADOS
          ======================== */}

          {!loadingUsers &&
            !usersError &&
            userSearch.trim() &&
            filteredUsers.length === 0 && (

              <div className="admin-email-recipient-info">

                <span>
                  🔎
                </span>

                <div>
                  <strong>
                    No se encontraron usuarios
                  </strong>
                </div>

              </div>
            )}

        </div>
      )}


      {/* =======================
          TODOS LOS USUARIOS
      ======================== */}

      {value.type === "all_users" && (

        <div className="admin-email-recipient-info">

          <span>
            👥
          </span>

          <div>

            <strong>
              Todos los usuarios
            </strong>

            <small>
              Se enviará a todos los usuarios
              registrados de Bellumartis.
            </small>

          </div>

        </div>
      )}


      {/* =======================
          TODOS LOS USUARIOS DE ESPAÑA
      ======================== */}

      {value.type === "spain_users" && (

        <div className="admin-email-recipient-info">

          <span>
            🇪🇸
          </span>

          <div>

            <strong>
              Todos los usuarios de España
            </strong>

            <small>
              Se enviará a los usuarios registrados
              cuya provincia esté en España.
            </small>

          </div>

        </div>
      )}


      {/* =======================
          PROVINCIA
      ======================== */}

      {value.type === "province" && (

        <select
          className="admin-email-recipient-input"
          value={value.recipients[0] || ""}
          onChange={handleProvinceChange}
        >

          <option value="">
            Seleccionar provincia...
          </option>

          {SPAIN_PROVINCES.map((province) => (

            <option
              key={province}
              value={province}
            >
              {province}
            </option>

          ))}

        </select>
      )}


      {/* =======================
          NEWSLETTER
      ======================== */}

      {value.type === "newsletter" && (

        <div className="admin-email-recipient-info">

          <span>
            📬
          </span>

          <div>

            <strong>
              Suscriptores newsletter
            </strong>

            <small>
              Se enviará a todos los suscriptores
              activos de la newsletter.
            </small>

          </div>

        </div>
      )}


      {/* =======================
          EMAIL MANUAL
      ======================== */}

      {value.type === "custom" && (

        <div className="admin-email-recipient-input-row">

          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              onPendingCustomEmailChange?.(
                event.target.value
              );
            }}
            onKeyDown={(event) => {

              if (event.key === "Enter") {
                event.preventDefault();
                addCustomEmail();
              }

            }}
            placeholder="Escribe una dirección de email..."
          />

          <button
            type="button"
            onClick={addCustomEmail}
          >
            Añadir
          </button>

        </div>
      )}


      {/* =======================
          DESTINATARIOS SELECCIONADOS
      ======================== */}

      {value.recipients.length > 0 && (

        <div className="admin-email-recipient-tags">

          {value.recipients.map(
            (recipient, index) => (

              <div
                className="admin-email-recipient-tag"
                key={`${recipient}-${index}`}
              >

                <span>

                  {value.type === "province"
                    ? `📍 ${recipient}`
                    : recipient}

                </span>

                <button
                  type="button"
                  onClick={() =>
                    removeRecipient(index)
                  }
                >
                  ×
                </button>

              </div>

            )
          )}

        </div>
      )}

    </div>
  );
}

