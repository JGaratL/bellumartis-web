import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ProfileCard from "../components/ProfileCard";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./Settings.css";

function Settings() {
  const [user, setUser] = useState(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      const res = await api.get("/users/me");
      setUser(res.data);
    };

    fetchUser();
  }, []);

  const updateProfile = async (data) => {
    try {
      const payload = {
        nickname: data?.nickname ?? null,
        province: data?.province ?? null,
        country: data?.country ?? null,
        profile_image: data?.profile_image ?? null,
        x_url: data?.x_url ?? null,
        facebook_url: data?.facebook_url ?? null,
        instagram_url: data?.instagram_url ?? null,
        youtube_url: data?.youtube_url ?? null,
      };

      await api.put("/users/me", payload);

      const res = await api.get("/users/me");
      setUser(res.data);
      updateUser(res.data);
      setShowSavedModal(true);
    } catch (err) {
      console.error("Error guardando perfil:", err);
    }
  };

  if (!user) return <div>Cargando...</div>;

  return (
    <>
      <ProfileCard
        user={user}
        editable={true}
        onSave={updateProfile}
        onClose={() => navigate("/profile")}
      />

      {showSavedModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-title">Cambios guardados</div>
            <div className="delete-modal-message">
              Sus cambios se han guardado
            </div>
            <div className="delete-modal-buttons">
              <button
                className="pc-btn-modal"
                onClick={() => setShowSavedModal(false)}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;
