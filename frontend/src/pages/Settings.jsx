import { useEffect, useState } from "react";
import ProfileCard from "../components/ProfileCard";
import api from "../api";

function Settings() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await api.get("/users/me");
      setUser(res.data);
    };

    fetchUser();
  }, []);

  const updateProfile = async (data) => {
    await api.put("/users/me", data);
  };

  if (!user) return <div>Cargando...</div>;

  return (
    <ProfileCard
      user={user}
      editable={true}
      onSave={updateProfile}
    />
  );
}

export default Settings;