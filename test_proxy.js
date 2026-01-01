async function testProxy() {
    const baseUrl = "https://gemini.vibita.io";

    console.log(`Checking proxy at ${baseUrl}...`);

    // 1. List Models
    try {
        const res = await fetch(`${baseUrl}/v1/models`);
        if (!res.ok) {
            throw new Error(`List Models Failed: ${res.status} ${await res.text()}`);
        }
        const data = await res.json();
        console.log("Available Models:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error listing models:", err.message);
    }

    // 2. Test Chat Completion
    console.log("\nAttempting simple chat completion...");
    try {
        const payload = {
            model: "gemini-3-pro-preview", // Check if this exists on remote too
            messages: [{ role: "user", content: "Hi" }]
        };

        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log(`Chat Response (${res.status}):`, text);
    } catch (err) {
        console.error("Error asking chat:", err.message);
    }
}

testProxy();
