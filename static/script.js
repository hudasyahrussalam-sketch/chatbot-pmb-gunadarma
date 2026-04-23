const suggestions = [
    "Apa itu PMB?",
    "Bagaimana cara pendaftaran?",
    "Berapa biaya kuliah di Gunadarma?",
    "Apa saja jurusan di Gunadarma?",
    "Apakah ada beasiswa?"
];

/* ── NAMA USER ──────────────────────────── */
function getInitials(name) {
    return name.trim().split(" ")
        .map(w => w[0].toUpperCase())
        .slice(0, 2).join("");
}

function loadUserName() {
    let name = localStorage.getItem("user_name");
    if (!name) {
        document.getElementById("name-overlay").classList.remove("hidden");
        setTimeout(() => document.getElementById("name-input").focus(), 300);
    } else {
        applyUserName(name);
    }
}

function applyUserName(name) {
    let initials = getInitials(name);
    document.getElementById("sidebar-avatar").innerText = initials;
    document.getElementById("sidebar-name").innerText = name;
    let welcome = document.getElementById("welcome-msg");
    if (welcome) {
        welcome.innerHTML = `Halo, <b>${name}!</b> 👋 Selamat datang di Chatbot PMB Universitas Gunadarma 2026.<br><br>
        Saya siap membantu menjawab pertanyaan kamu seputar pendaftaran, biaya kuliah, jurusan, dan beasiswa. Silakan mulai bertanya!
        <div class="suggestion-chips">
            <div class="chip" onclick="quickAsk('Bagaimana cara mendaftar PMB?')">Cara daftar</div>
            <div class="chip" onclick="quickAsk('Berapa biaya kuliah di Gunadarma?')">Biaya kuliah</div>
            <div class="chip" onclick="quickAsk('Apa saja beasiswa di Gunadarma?')">Beasiswa</div>
            <div class="chip" onclick="quickAsk('Apa saja jurusan di Gunadarma?')">Jurusan</div>
        </div>`;
    }
    document.getElementById("name-overlay").classList.add("hidden");
}

function saveName() {
    let input = document.getElementById("name-input");
    let name = input.value.trim();
    if (!name) {
        input.style.borderColor = "rgba(239,68,68,0.6)";
        input.placeholder = "Nama tidak boleh kosong!";
        setTimeout(() => {
            input.style.borderColor = "";
            input.placeholder = "Masukkan nama kamu...";
        }, 2000);
        return;
    }
    localStorage.setItem("user_name", name);
    applyUserName(name);
}

function editName() {
    let currentName = localStorage.getItem("user_name") || "";
    document.getElementById("name-input").value = currentName;
    document.getElementById("name-overlay").classList.remove("hidden");
    setTimeout(() => document.getElementById("name-input").focus(), 100);
}

function handleNameKey(e) {
    if (e.key === "Enter") saveName();
}

/* ── HELPER ─────────────────────────────── */
function getCleanHistory() {
    let data = localStorage.getItem("chat_history");
    if (!data) return [];
    let messages = JSON.parse(data);
    return messages.slice(-6).map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text.replace(/<[^>]*>/g, "")
    }));
}

function getUserInitials() {
    let name = localStorage.getItem("user_name") || "T";
    return getInitials(name);
}

function getUserName() {
    return localStorage.getItem("user_name") || "Kamu";
}

function getTime() {
    let now = new Date();
    return now.getHours().toString().padStart(2, "0") + ":" +
           now.getMinutes().toString().padStart(2, "0");
}

function handleKey(e) {
    if (e.key === "Enter") sendMessage();
}

/* ── INIT ───────────────────────────────── */
window.onload = () => {
    loadUserName();
    loadChat();
    setTimeout(() => {
        const chat = document.getElementById("chatbox");
        chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
    }, 150);
};

/* ── SAVE & LOAD CHAT ───────────────────── */
function saveChat(data) {
    localStorage.setItem("chat_history", JSON.stringify(data));
}

function loadChat() {
    let chatbox = document.getElementById("chatbox");
    let data = localStorage.getItem("chat_history");
    if (!data) return;

    let messages = JSON.parse(data);
    let initials = getUserInitials();
    let userName = getUserName();

    chatbox.innerHTML = '<div class="date-divider">Riwayat percakapan</div>';

    messages.forEach(msg => {
        let row = document.createElement("div");
        row.className = "chat-row " + (msg.sender === "user" ? "user-row" : "bot-row");

        if (msg.sender === "user") {
            row.innerHTML = `
                <div class="msg-wrap">
                    <div class="msg-name" style="text-align:right">${userName}</div>
                    <div class="message user-message">${msg.text}</div>
                    <div class="msg-time" style="text-align:right">${msg.time || ""}</div>
                </div>
                <div class="avatar user-av">${initials}</div>`;
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

/* ── SEND MESSAGE ───────────────────────── */
async function sendMessage() {
    let input = document.getElementById("message");
    let message = input.value.trim();
    if (!message) return;

    let chat = document.getElementById("chatbox");
    let history = JSON.parse(localStorage.getItem("chat_history")) || [];
    let time = getTime();
    let initials = getUserInitials();
    let userName = getUserName();

    /* USER MESSAGE */
    let userRow = document.createElement("div");
    userRow.className = "chat-row user-row";
    userRow.innerHTML = `
        <div class="msg-wrap">
            <div class="msg-name" style="text-align:right">${userName}</div>
            <div class="message user-message">${message}</div>
            <div class="msg-time" style="text-align:right">${time}</div>
        </div>
        <div class="avatar user-av">${initials}</div>`;
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