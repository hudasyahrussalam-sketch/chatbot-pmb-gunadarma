from flask import Flask, render_template, request, Response, stream_with_context
from chatbot_engine import stream_response

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data        = request.get_json()
    message     = data.get("message", "").strip()
    # Ambil riwayat chat dari request
    chat_history = data.get("history", [])

    if not message:
        return Response("Pesan tidak boleh kosong.", mimetype="text/plain")

    return Response(
        stream_with_context(stream_response(message, chat_history)),
        mimetype="text/plain"
    )

if __name__ == "__main__":
    app.run(debug=True)