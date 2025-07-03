const ws = new WebSocket("ws://localhost:8080");
const sessionId = "session1"; // Could be dynamic later

const joinBtn = document.getElementById("joinBtn");
const iframeWrapper = document.getElementById("iframeWrapper");
const viewerFrame = document.getElementById("viewerFrame");
const closeBtn = document.getElementById("closeBtn");

let hostAvailable = false;

ws.onopen = () => {
  // Ask the server if host is available
  ws.send(JSON.stringify({ type: "register", role: "guest", sessionId }));
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "host-status") {
    if (data.available) {
      hostAvailable = true;
      joinBtn.disabled = false;
      joinBtn.textContent = "Join Session";
      joinBtn.style.background = "green";
      joinBtn.style.color = "white";
    } else {
      joinBtn.disabled = true;
      joinBtn.textContent = "Host is offline";
      joinBtn.style.background = "gray";
    }
  }

  // Mirror events here later, e.g. DOM snapshots
  if (data.type === "snapshot" && viewerFrame.contentWindow) {
    viewerFrame.contentWindow.document.open();
    viewerFrame.contentWindow.document.write(data.payload.html);
    viewerFrame.contentWindow.document.close();
  }

  if (data.type === "event") {
    // Future: replay scroll, input, etc.
  }
};

joinBtn.addEventListener("click", () => {
  if (!hostAvailable) return;

  // Ask server to start syncing with host
  ws.send(JSON.stringify({ type: "join-session", role: "guest", sessionId }));

  // Show iframe
  iframeWrapper.style.display = "block";
});

closeBtn.addEventListener("click", () => {
  iframeWrapper.style.display = "none";
  viewerFrame.srcdoc = "";
  ws.send(JSON.stringify({ type: "leave", sessionId, role: "guest" }));
});
