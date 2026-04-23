const suggestions = [
    "Apa itu PMB?",
    "Bagaimana cara pendaftaran?",
    "Berapa biaya kuliah di Gunadarma?",
    "Apa saja jurusan di Gunadarma?",
    "Apakah ada beasiswa?"
];

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

window.onload = () => {
    loadChat();
    setTimeout(() => {
        const chat = document.getElementById("chatbox");
        chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
    }, 100);
};

function saveChat(data) {
    localStorage.setItem("chat_history", JSON.stringify(data));
}

function loadChat() {
    let chatbox = document.getElementById("chatbox");
    let data = localStorage.getItem("chat_history");
    if (!data) return;

    let messages = JSON.parse(data);
    chatbox.innerHTML = '<div class="date-divider">Riwayat percakapan</div>';

    messages.forEach(msg => {
        let row = document.createElement("div");
        row.className = "chat-row " + (msg.sender === "user" ? "user-row" : "bot-row");

        if (msg.sender === "user") {
            row.innerHTML = `
                <div class="msg-wrap">
                    <div class="msg-name" style="text-align:right">Kamu</div>
                    <div class="message user-message">${msg.text}</div>
                    <div class="msg-time" style="text-align:right">${msg.time || ""}</div>
                </div>
                <div class="avatar user-av">MH</div>`;
        } else {
            row.innerHTML = `
                <div class="avatar bot-av">🤖</div>
                <div class="msg-wrap">
                    <div class="msg-name">Gunadarma AI</div>
                    <div class="message bot-message">${msg.text}</div>
                    <div class="msg-time">${msg.time || ""}</div>
                </div>`;
        }
        chatbox.appendChild(row);
    });

    setTimeout(() => {
        chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: 'smooth' });
    }, 100);
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
    div.className = "suggestion-chips";
    suggestions.forEach(s => {
        let btn = document.createElement("div");
        btn.className = "chip";
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
    let input = document.getElementById("message");
    let message = input.value.trim();
    if (!message) return;

    let chat = document.getElementById("chatbox");
    let history = JSON.parse(localStorage.getItem("chat_history")) || [];
    let time = getTime();

    /* USER MESSAGE */
    let userRow = document.createElement("div");
    userRow.className = "chat-row user-row";
    userRow.innerHTML = `
        <div class="msg-wrap">
            <div class="msg-name" style="text-align:right">Kamu</div>
            <div class="message user-message">${message}</div>
            <div class="msg-time" style="text-align:right">${time}</div>
        </div>
        <div class="avatar user-av">MH</div>`;
    chat.appendChild(userRow);
    history.push({ sender: "user", text: message, time });
    input.value = "";
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });

    /* TYPING INDICATOR */
    let typingRow = document.createElement("div");
    typingRow.className = "chat-row bot-row";
    typingRow.id = "typing-indicator";
    typingRow.innerHTML = `
        <div class="avatar bot-av">🤖</div>
        <div class="msg-wrap">
            <div class="msg-name">Gunadarma AI</div>
            <div class="typing-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>`;
    chat.appendChild(typingRow);
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });

    /* BOT BUBBLE */
    let botRow = document.createElement("div");
    botRow.className = "chat-row bot-row";
    let botBubble = document.createElement("div");
    botBubble.className = "message bot-message";
    botBubble.innerHTML = `<span class="typing-cursor">▍</span>`;

    let fullText = "";

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, history: getCleanHistory() })
        });

        /* Hapus typing indicator saat mulai streaming */
        let indicator = document.getElementById("typing-indicator");
        if (indicator) indicator.remove();

        botRow.innerHTML = `
            <div class="avatar bot-av">🤖</div>
            <div class="msg-wrap">
                <div class="msg-name">Gunadarma AI</div>
            </div>`;
        botRow.querySelector(".msg-wrap").appendChild(botBubble);
        chat.appendChild(botRow);
        chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;

            botBubble.innerHTML =
                fullText.replace(/\n/g, "<br>") +
                `<span class="typing-cursor">▍</span>`;

            chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
        }

    } catch (err) {
        let indicator = document.getElementById("typing-indicator");
        if (indicator) indicator.remove();

        botRow.innerHTML = `
            <div class="avatar bot-av">🤖</div>
            <div class="msg-wrap">
                <div class="msg-name">Gunadarma AI</div>
            </div>`;
        botRow.querySelector(".msg-wrap").appendChild(botBubble);
        chat.appendChild(botRow);
        fullText = "Terjadi kesalahan koneksi. Silakan coba lagi.";
    }

    /* Selesai streaming */
    botBubble.innerHTML = fullText.replace(/\n/g, "<br>");

    let timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.innerText = time;
    botRow.querySelector(".msg-wrap").appendChild(timeDiv);

    if (fullText.toLowerCase().includes("belum memiliki informasi")) {
        showSuggestions(botBubble);
    }

    history.push({ sender: "bot", text: fullText, time });
    saveChat(history);
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
}