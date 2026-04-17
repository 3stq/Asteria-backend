import app from "./server";

const PORT = 8080; // ← your requested port
app.listen(PORT, () => {
  console.log(`[HTTP] Lyric server listening on :${PORT}`);
});
