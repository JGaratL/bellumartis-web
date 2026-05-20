import { useEffect, useState } from "react";
import ProfileCard from "../components/ProfileCard";
import api from "../api";

function MyProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/users/me");
        setUser(res.data);
      } catch (err) {
        console.error("Error cargando perfil:", err);
      }
    };

    fetchUser();
  }, []);

  if (!user) return <div>Cargando...</div>;

  return <ProfileCard user={user} editable={false} />;
}

export default MyProfile;