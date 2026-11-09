const API_URL = "http://127.0.0.1:5000/api";

async function apiRequest(path, options) {
  let res;
  try {
    res = await fetch(API_URL + path, options);
  } catch (e) {
    throw new Error("No hay conexión con el servidor");
  }
  let body = null;
  try {
    body = await res.json();
  } catch (e) {}
  if (!res.ok || !body || !body.success) {
    throw new Error((body && body.error) || "Error del servidor");
  }
  return body.data;
}

function getTopScores(limit) {
  return apiRequest("/scores?limit=" + limit);
}

function sendScore(nickname, score, level) {
  return apiRequest("/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname: nickname, score: score, level: level })
  });
}