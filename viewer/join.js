const ws = new WebSocket("ws://localhost:8080");
const sessionId = "session1"; // Could be dynamic later

const joinBtn = document.getElementById("joinBtn");
const iframeWrapper = document.getElementById("iframeWrapper");
const viewerFrame = document.getElementById("viewerFrame");
const closeBtn = document.getElementById("closeBtn");

let hostAvailable = false;

function showClickMarker(x, y, document) {
  const scrollX =
    document.documentElement.scrollLeft || document.body.scrollLeft;
  const scrollY = document.documentElement.scrollTop || document.body.scrollTop;

  const marker = document.createElement("div");
  marker.style.position = "absolute";
  marker.style.left = `${x + scrollX}px`; // adjust X
  marker.style.top = `${y + scrollY}px`; // adjust Y
  marker.style.width = "20px";
  marker.style.height = "20px";
  marker.style.background = "rgba(255, 0, 0, 0.5)";
  marker.style.border = "2px solid red";
  marker.style.borderRadius = "50%";
  marker.style.pointerEvents = "none";
  marker.style.transform = "translate(-50%, -50%)";
  marker.style.zIndex = "9999";
  marker.style.transition = "opacity 0.4s ease-out";

  document.body.appendChild(marker);

  requestAnimationFrame(() => {
    marker.style.opacity = "0";
  });

  setTimeout(() => {
    marker.remove();
  }, 400);
}

function showCursor(x, y, document) {
  const scrollX =
    document.documentElement.scrollLeft || document.body.scrollLeft;
  const scrollY = document.documentElement.scrollTop || document.body.scrollTop;

  // Remove previous cursor if exists
  const existingCursor = document.getElementById("hostCursor");
  if (existingCursor) existingCursor.remove();

  // Create wrapper div
  const cursorWrapper = document.createElement("div");
  cursorWrapper.id = "hostCursor";
  cursorWrapper.style.position = "absolute";
  cursorWrapper.style.left = `${x + scrollX}px`;
  cursorWrapper.style.top = `${y + scrollY}px`;
  cursorWrapper.style.pointerEvents = "none";
  cursorWrapper.style.zIndex = "9999";
  cursorWrapper.style.transform = "translate(-10%, -10%)";

  // Use a simple SVG arrow that looks like a cursor
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" viewBox="0 0 24 36">
    <path d="M2,1 L22,18 L14,18 L18,35 L10,35 L6,18 L2,18 Z" fill="white" stroke="green" stroke-width="1.5"/>
  </svg>
`;

  const encodedSvg = `data:image/svg+xml;base64,${btoa(svg)}`;

  // Add cursor image
  const cursorImg = document.createElement("img");
  cursorImg.src = encodedSvg;
  cursorImg.style.width = "16px";
  cursorImg.style.height = "24px";
  cursorImg.style.display = "block";
  cursorImg.style.userSelect = "none";

  // Add label
  const label = document.createElement("div");
  label.textContent = "Host";
  label.style.position = "absolute";
  label.style.top = "40px";
  label.style.left = "0px";
  label.style.fontSize = "12px";
  label.style.color = "red";
  label.style.background = "white";
  label.style.border = "1px solid red";
  label.style.borderRadius = "4px";
  label.style.padding = "2px 4px";
  label.style.fontFamily = "sans-serif";
  label.style.whiteSpace = "nowrap";

  cursorWrapper.appendChild(cursorImg);
  cursorWrapper.appendChild(label);

  document.body.appendChild(cursorWrapper);
}

ws.onopen = () => {
  ws.send(
    JSON.stringify({ type: "register", role: "guest", name: "Eric", sessionId })
  );
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

    // TODO: remove when figure out why click doesn't show before input
    const dummyInput = viewerFrame.contentDocument.createElement("input");
    dummyInput.style.position = "absolute";
    dummyInput.style.opacity = "0";
    viewerFrame.contentDocument.body.appendChild(dummyInput);
    dummyInput.focus();
    dummyInput.remove();

    viewerFrame.contentWindow.focus();
  }

  if (data.type === "session-ended") {
    iframeWrapper.style.display = "none";
    viewerFrame.srcdoc = "";
    joinBtn.style.display = "block";
    return;
  }

  if (data.type === "event") {
    if (data.payload.action === "scroll") {
      const { scrollX, scrollY } = data.payload;

      if (viewerFrame && viewerFrame.contentWindow) {
        viewerFrame.contentDocument.documentElement.scrollTo(scrollX, scrollY);
        viewerFrame.contentDocument.body?.scrollTo(scrollX, scrollY);
      }
    }

    if (data.payload.action === "resize") {
      const { height, width } = data.payload;

      if (viewerFrame && viewerFrame.contentWindow) {
        viewerFrame.style.width = `${width}px`;
        viewerFrame.style.height = `${height}px`;
      }
    }

    if (data.payload.action === "click") {
      const { x, y } = data.payload;

      console.log("received coords");
      if (viewerFrame) {
        viewerFrame.focus();
        console.log("setting click animation");
        showClickMarker(x, y, viewerFrame.contentDocument);
      }
    }

    if (data.payload.action === "mousemove") {
      const { x, y } = data.payload;

      if (viewerFrame) {
        viewerFrame.focus();
        showCursor(x, y, viewerFrame.contentDocument);
      }
    }

    if (data.payload.action === "select-open") {
      const el = viewerFrame.contentWindow.document.querySelector(
        `[data-cob-id="${data.payload.target}"]`
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
      const { target, value } = data.payload;

      if (viewerFrame && viewerFrame.contentDocument) {
        const el = viewerFrame.contentDocument.querySelector(
          `[data-cob-id="${target}"]`
        );
        if (el && el.tagName === "select") {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (el.tagName === "INPUT") {
          const ie = el;
          if (ie.type === "checkbox" || ie.type === "radio") {
            ie.checked = value === true || value === "true";
            ie.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            ie.value = value;
            ie.dispatchEvent(new Event("input", { bubbles: true }));
          }
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
  joinBtn.style.display = "none";
});

closeBtn.addEventListener("click", () => {
  iframeWrapper.style.display = "none";
  viewerFrame.srcdoc = "";
  joinBtn.style.display = "block";
  ws.send(
    JSON.stringify({
      type: "guest-closed-cobrowsing",
      sessionId,
      role: "guest",
      name: "Eric",
    })
  );
});

window.addEventListener("beforeunload", () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({ type: "leave", sessionId, role: "guest", name: "Eric" })
    );
  }
});
