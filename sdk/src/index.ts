(function () {
  const ws = new WebSocket("ws://localhost:8080");
  const sessionId = "session1";
  const isHost = true;
  let guestConnected = false;
  let cobrowsingStarted = false;
  let guestName: string;
  type ElType = { id: string; type: string };

  // === Toast UI ===
  function showToast(message: string) {
    let container = document.getElementById("cobrowsing-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "cobrowsing-toast-container";
      Object.assign(container.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "999999",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      });
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    Object.assign(toast.style, {
      background: "#333",
      color: "#fff",
      padding: "10px 16px",
      borderRadius: "6px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      fontSize: "14px",
      opacity: "0",
      transform: "translateY(-10px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    });
    toast.innerText = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // === End Session Button ===
  function createEndSessionButton() {
    if (document.getElementById("cobrowsing-end-btn")) return;
    const btn = document.createElement("button");
    btn.id = "cobrowsing-end-btn";
    btn.textContent = "End Session";
    Object.assign(btn.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "999999",
      padding: "10px 16px",
      background: "#e74c3c",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    });
    btn.onclick = () => {
      sendSafely({ type: "kick-viewer", sessionId, guestName });
      cobrowsingStarted = false;
      guestName = "";
      showToast("Session ended");
      btn.remove();
    };
    document.body.appendChild(btn);
  }

  function safeCreateEndSessionButton() {
    if (!guestConnected || !cobrowsingStarted) {
      console.warn(
        "Skipping End Session button creation — no active cobrowsing session."
      );
      return;
    }
    // only create if it doesn't already exist
    if (!document.getElementById("cobrowsing-end-btn")) {
      createEndSessionButton();
    }
  }

  function assignCobIds() {
    const cobIdArr: ElType[] = [];

    document
      .querySelectorAll("button, input, textarea, a, div, select")
      .forEach((el, i) => {
        const id = `cob-${i}`;
        el.setAttribute("data-cob-id", id);
        cobIdArr.push({ id, type: el.tagName.toLowerCase() });
      });
    ws.send(
      JSON.stringify({
        type: "register",
        role: "host",
        name: "Sam",
        sessionId,
        cobIdArr,
      })
    );

    return cobIdArr;
  }

  function sendSafely(data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not ready, skipping send", data);
    }
  }

  function detectRouteChange(callback: () => void) {
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function (...args) {
      pushState.apply(history, args);
      callback();
    };

    history.replaceState = function (...args) {
      replaceState.apply(history, args);
      callback();
    };
    window.addEventListener("popstate", () => callback());
  }

  detectRouteChange(() => {
    setTimeout(() => {
      assignCobIds();

      const html = document.documentElement.outerHTML;
      const payload = {
        html,
        width: window.innerWidth,
        height: window.innerHeight,
        url: window.location.href,
      };
      sendSafely({ type: "snapshot", sessionId, payload });
    }, 50);
  });

  document.addEventListener("DOMContentLoaded", () => {
    ws.onopen = () => {
      console.log("WebSocket opened");
      if (isHost) {
        assignCobIds();
        ws.send(
          JSON.stringify({
            type: "register",
            role: "host",
            sessionId,
          })
        );
        console.log("registered");

        requestAnimationFrame(() => {
          const html = document.documentElement.outerHTML;
          const payload = {
            type: "dom",
            html,
            url: window.location.href,
            width: window.innerWidth,
            height: window.innerHeight,
          };
          console.log("sending first snapshot");
          sendSafely({ type: "snapshot", sessionId, payload });
        });
      }
    };
  });

  // === NEW: Listen for viewer connect/disconnect events from server ===
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "viewer-connected") {
        showToast(`Viewer ${data.name} connected`);
        guestConnected = true;
        guestName = data.name;
      }
      if (data.type === "viewer-disconnected") {
        showToast(`Viewer ${data.name} disconnected`);
        guestConnected = false;
        guestName = "";
      }
      if (data.type === "guest-started-cobrowsing") {
        showToast(`Viewer ${data.name} started a cobrowsing session.`);
        guestConnected = true;
        cobrowsingStarted = true;
        safeCreateEndSessionButton();
      }
      if (data.type === "guest-closed-cobrowsing") {
        showToast(`Viewer ${data.name} started a cobrowsing session.`);

        cobrowsingStarted = false;
      }
    } catch (err) {
      console.warn("Invalid WS message", err);
    }
  };

  if (isHost && cobrowsingStarted) {
    window.addEventListener("resize", () => {
      const data = {
        type: "event",
        sessionId,
        payload: {
          action: "resize",
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };
      console.log("sending resize");
      sendSafely(data);
    });

    document.addEventListener("scroll", () => {
      const data = {
        type: "event",
        sessionId,
        payload: {
          action: "scroll",
          target: "window",
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
      };
      console.log("sending scroll");
      sendSafely(data);
    });

    document.addEventListener("mousemove", (e) => {
      sendSafely({
        type: "event",
        sessionId,
        payload: { action: "mousemove", x: e.clientX, y: e.clientY },
      });
    });

    document.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const cobId = target.getAttribute("data-cob-id");
      sendSafely({
        type: "event",
        sessionId,
        payload: {
          action: "input",
          target: cobId,
          value: target.value,
        },
      });
    });

    document.querySelectorAll("select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const target = e.target as HTMLSelectElement;
        const cobId = target.getAttribute("data-cob-id");
        sendSafely({
          type: "event",
          sessionId,
          payload: {
            action: "select",
            target: cobId,
            value: target.value,
          },
        });
      });
    });

    document.addEventListener("change", (e) => {
      const el = e.target as HTMLSelectElement;
      sendSafely({
        type: "event",
        sessionId,
        payload: {
          action: "select",
          target: el.getAttribute("data-cob-id"),
          value: el.value,
        },
      });
    });

    document.addEventListener("click", (e) => {
      sendSafely({
        type: "event",
        sessionId,
        payload: { action: "click", x: e.clientX, y: e.clientY },
      });
    });

    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a") as HTMLAnchorElement;
      if (anchor && anchor.href) {
        sendSafely({
          type: "event",
          sessionId,
          payload: {
            action: "link-click",
            href: anchor.href,
            target: anchor.getAttribute("data-cob-id") || null,
          },
        });
      }
    });

    document.addEventListener("submit", (e) => {
      const target = e.target as HTMLInputElement;
      sendSafely({
        type: "event",
        sessionId,
        payload: {
          action: "submit",
          target: target.getAttribute("data-cob-id"),
        },
      });
    });
  }

  window.addEventListener("beforeunload", () => {
    ws.send(
      JSON.stringify({
        type: "leave",
        role: isHost ? "host" : "guest",
        sessionId,
        name: "Sam",
        time: new Date().toLocaleTimeString(),
      })
    );
    ws.close();
  });
})();
