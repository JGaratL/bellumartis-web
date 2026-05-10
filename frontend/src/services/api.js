const API_URL = "http://localhost:5000";

export async function getEvents() {

  const response = await fetch(`${API_URL}/events`);

  if (!response.ok) {
    throw new Error("Error obteniendo eventos");
  }

  return response.json();
}