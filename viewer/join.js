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

  if (data.type === "snapshot" && viewerFrame.contentWindow) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.html, "text/html");
    doc.querySelectorAll("script").forEach((script) => script.remove());

    viewerFrame.contentWindow.document.open();
    viewerFrame.contentWindow.document.write(doc.documentElement.outerHTML);

    viewerFrame.contentWindow.document.close();
  }

  if (data.type === "event") {
    if (data.payload.action === "scroll") {
      const { scrollX, scrollY } = data.payload;

      if (viewerFrame && viewerFrame.contentWindow) {
        viewerFrame.contentDocument.documentElement.scrollTo(scrollX, scrollY);
        viewerFrame.contentDocument.body?.scrollTo(scrollX, scrollY);
      }
    }

    if (data.payload.action === "select-open") {
      const el = viewerFrame.contentWindow.document.querySelector(
        `[data-cob-id="${payload.target}"]`
      );
      if (el && el.tagName === "SELECT") {
        el.focus();
      }
    }

    if (data.payload.action === "focus") {
      console.log("focus event");
      console.log(data.payload);

      const el = viewerFrame.contentWindow.document.querySelector(
        `[data-cob-id="${data.payload.target}"]`
      );
      console.log(el);
      if (!el) return;
      viewerFrame.focus();
      el.focus();
      el.dispatchEvent(new Event("focus", { bubbles: true }));
    }

    if (data.payload.action === "input") {
      const { action, target, value } = data.payload;

      const el = viewerFrame.contentWindow.document.querySelector(
        `[data-cob-id="${target}"]`
      );

      if (!el) return;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (data.payload.action === "select") {
      console.log("received select data");
      const { target, value } = data.payload;
      console.log("target: ", target);
      console.log("value: ", value);

      if (viewerFrame && viewerFrame.contentDocument) {
        const el = viewerFrame.contentDocument.querySelector(
          `[data-cob-id="${target}"]`
        );
        console.log(el);
        if (el && el.type === "select") {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if ((el && el.type === "checkbox") || el.type === "radio") {
          el.checked = true;
        }
      }
    }

    // const iframeDoc = viewerFrame?.contentWindow.document;
    // if (iframeDoc) {
    //   iframeDoc.documentElement.scrollTo(scrollX, scrollY);
    //   iframeDoc.scrollTo(scrollX, scrollY);
    // }
  }
};

joinBtn.addEventListener("click", () => {
  if (!hostAvailable) return;

  // Ask server to start syncing with host
  ws.send(
    JSON.stringify({
      type: "join-session",
      role: "guest",
      sessionId,
      guest_name: "Eric",
    })
  );

  // Show iframe
  iframeWrapper.style.display = "block";
});

closeBtn.addEventListener("click", () => {
  iframeWrapper.style.display = "none";
  viewerFrame.srcdoc = "";
  ws.send(JSON.stringify({ type: "leave", sessionId, role: "guest" }));
});
