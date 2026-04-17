import fetch from "node-fetch";

export async function sendHypeUpdate(username: string, reason: "Kill" | "Top5" | "Top10") {
    const url = `http://45.145.226.11:8080/sessions/api/v1/hype/${username}/${reason}`;

    try {
        const res = await fetch(url);
        const text = await res.text();

        if (res.ok) {
            console.log(`[HYPE UPDATE] ${username} (${reason}) → ${text}`);
        } else {
            console.warn(`[HYPE UPDATE FAILED] ${username} (${reason}) → ${text}`);
        }
    } catch (err) {
        console.error(`[HYPE UPDATE ERROR] ${username} (${reason})`, err);
    }
}
