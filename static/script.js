const suggestions = [
    "Apa itu PMB?",
    "Bagaimana cara pendaftaran?",
    "Berapa biaya kuliah di Gunadarma?",
    "Apa saja jurusan di Gunadarma?",
    "Apakah ada beasiswa?"
];

// Ambil riwayat chat dalam format yang dibutuhkan backend
function getCleanHistory() {
    let data = localStorage.getItem("chat_history");
    if (!data) return [];
    let messages = JSON.parse(data);
    return messages.slice(-6).map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text.replace(/<[^>]*>/g, "")
    }));
}

function getTime() {
    let now = new Date();
    return now.getHours().toString().padStart(2, "0") + ":" +
           now.getMinutes().toString().padStart(2, "0");
}

function handleKey(e) {
    if (e.key === "Enter") sendMessage();
}

window.onload = () => { loadChat(); };

function saveChat(data) {
    localStorage.setItem("chat_history", JSON.stringify(data));
}

function loadChat() {
    let chatbox = document.getElementById("chatbox");
    let data    = localStorage.getItem("chat_history");
    if (!data) return;

    let messages = JSON.parse(data);
    chatbox.innerHTML = "";

    messages.forEach(msg => {
        let row = document.createElement("div");
        row.className = "chat-row " + (msg.sender === "user" ? "user-row" : "bot-row");
        row.innerHTML = `
            <div class="message ${msg.sender === "user" ? "user-message" : "bot-message"}">
                ${msg.text}<span class="time">${msg.time || ""}</span>
            </div>`;
        chatbox.appendChild(row);
    });

    chatbox.scrollTop = chatbox.scrollHeight;
}

function newChat() {
    localStorage.removeItem("chat_history");
    location.reload();
}

function quickAsk(text) {
    document.getElementById("message").value = text;
    sendMessage();
}

function showSuggestions(container) {
    let div = document.createElement("div");
    div.className = "suggestion-container";
    suggestions.forEach(s => {
        let btn = document.createElement("div");
        btn.className = "suggestion-item";
        btn.innerText = s;
        btn.onclick = () => {
            document.getElementById("message").value = s;
            sendMessage();
        };
        div.appendChild(btn);
    });
    container.appendChild(div);
}

async function sendMessage() {
    let input   = document.getElementById("message");
    let message = input.value.trim();
    if (!message) return;

    let chat    = document.getElementById("chatbox");
    let history = JSON.parse(localStorage.getItem("chat_history")) || [];
    let time    = getTime();

    /* USER MESSAGE */
    let userRow = document.createElement("div");
    userRow.className = "chat-row user-row";
    userRow.innerHTML = `
        <div class="message user-message">
            ${message}<span class="time">${time}</span>
        </div>`;
    chat.appendChild(userRow);
    history.push({ sender: "user", text: message, time });
    input.value = "";
    chat.scrollTop = chat.scrollHeight;

    /* BOT BUBBLE */
    let botRow    = document.createElement("div");
    botRow.className = "chat-row bot-row";
    let botBubble = document.createElement("div");
    botBubble.className = "message bot-message";
    botBubble.innerHTML = `<span class="typing-cursor">▍</span>`;
    botRow.appendChild(botBubble);
    chat.appendChild(botRow);
    chat.scrollTop = chat.scrollHeight;

    /* STREAMING FETCH */
    let fullText = "";

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, history: getCleanHistory() })
        });

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText   += chunk;

            botBubble.innerHTML =
                fullText.replace(/\n/g, "<br>") +
                `<span class="typing-cursor">▍</span>`;

            chat.scrollTop = chat.scrollHeight;
        }

    } catch (err) {
        fullText = "Terjadi kesalahan koneksi. Silakan coba lagi.";
    }

    /* Selesai streaming */
    let timeSpan = document.createElement("span");
    timeSpan.className = "time";
    timeSpan.innerText = time;

    botBubble.innerHTML = fullText.replace(/\n/g, "<br>");
    botBubble.appendChild(timeSpan);

    if (fullText.toLowerCase().includes("belum memiliki informasi")) {
        showSuggestions(botBubble);
    }

    history.push({ sender: "bot", text: fullText, time });
    saveChat(history);
    chat.scrollTop = chat.scrollHeight;
}