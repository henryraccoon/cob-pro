(function () {
  const ws = new WebSocket("ws://localhost:8080");
  const sessionId = "session1";
  const isHost = true;
  type ElType = { id: string; type: string };

  document.addEventListener("DOMContentLoaded", () => {
    ws.onopen = () => {
      console.log("WebSocket opened");
      const cobIdArr: ElType[] = [];

      if (isHost) {
        document
          .querySelectorAll("button, input, textarea, a, div, select")
          .forEach((el, i) => {
            const id = `cob-${i}`;
            el.setAttribute("data-cob-id", id);
            cobIdArr.push({ id, type: el.tagName.toLowerCase() });
          });
      }
      ws.send(
        JSON.stringify({
          type: "register",
          role: isHost ? "host" : "guest",

          sessionId,
          cobIdArr,
        })
      );
      const html = document.documentElement.outerHTML;
      const payload = {
        type: "initial-dom",
        html,
        width: window.innerWidth,
        height: window.innerHeight,
        url: window.location.href,
      };
      ws.send(JSON.stringify({ type: "snapshot", sessionId, payload }));
    };
  });

  // if (isHost) {
  //   document.addEventListener("", (e) => {
  //     const data = {
  //       type: "event",
  //       sessionId,
  //       payload: { action: "" },
  //     };
  //     ws.send(JSON.stringify(data));
  //   });
  // }

  if (isHost) {
    document.addEventListener("scroll", (e) => {
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
      ws.send(JSON.stringify(data));
    });
  }

  // if (isHost) {
  //   document.addEventListener("mousemove", (e) => {
  //     const data = {
  //       type: "event",
  //       sessionId,
  //       payload: { action: "mousemove", x: e.clientX, y: e.clientY },
  //     };
  //     ws.send(JSON.stringify(data));
  //   });
  // }

  if (isHost) {
    document.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const cobId = target.getAttribute("data-cob-id");

      const data = {
        type: "event",
        sessionId,
        payload: {
          action: "input",
          target: cobId,
          value: target.value,
        },
      };
      ws.send(JSON.stringify(data));
    });
  }

  if (isHost) {
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
      ws.send(JSON.stringify(data));
    });
  }

  if (isHost) {
    document.querySelectorAll("select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const target = e.target as HTMLSelectElement;
        const cobId = target.getAttribute("data-cob-id");
        const value = target.value;

        const payload = {
          action: "select",
          target: cobId,
          value: value,
        };

        ws.send(JSON.stringify({ type: "event", sessionId, payload }));
      });
    });
  }

  if (isHost) {
    document.addEventListener("change", (e) => {
      const el = e.target as HTMLSelectElement;
      const payload = {
        action: "select",
        target: el.getAttribute("data-cob-id"),
        value: el.value,
      };
      ws.send(JSON.stringify({ type: "event", sessionId, payload }));
    });
  }

  if (isHost) {
    document.querySelectorAll("input, textarea").forEach((el) => {
      el.addEventListener("select", (e) => {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement;
        const payload = {
          action: "text-selection",
          target: input.getAttribute("data-cob-id"),
          selectionStart: input.selectionStart,
          selectionEnd: input.selectionEnd,
          value: input.value,
        };
        ws.send(JSON.stringify({ type: "event", sessionId, payload }));
      });
    });
  }

  if (isHost) {
    document.addEventListener("submit", (e) => {
      const target = e.target as HTMLInputElement;
      const cobId = target.getAttribute("data-cob-id");
      const data = {
        type: "event",
        sessionId,
        payload: { action: "submit", target: cobId },
      };
      ws.send(JSON.stringify(data));
    });
  }

  if (isHost) {
    document.addEventListener("click", (e) => {
      const data = {
        type: "event",
        sessionId,
        payload: { action: "click", x: e.clientX, y: e.clientY },
      };
      ws.send(JSON.stringify(data));
    });
  }

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a") as HTMLAnchorElement;
    if (anchor && anchor.href) {
      const payload = {
        action: "link-click",
        href: anchor.href,
        target: anchor.getAttribute("data-cob-id") || null,
      };
      ws.send(JSON.stringify({ type: "event", sessionId, payload }));
    }
  });

  window.addEventListener("beforeunload", () => {
    ws.send(
      JSON.stringify({
        type: "leave",
        role: isHost ? "host" : "guest",
        sessionId,
        time: new Date().toLocaleTimeString(),
      })
    );
    ws.close();
  });

  ws.onclose = () => {
    ws.send(
      JSON.stringify({
        type: "close",
        role: isHost ? "host" : "guest",
        time: new Date().toLocaleTimeString(),
      })
    );
  };
  // } else {
  //   ws.onmessage = (msg) => {
  //     const { type, payload } = JSON.parse(msg.data);
  //     if (type === "event" && payload.action === "click") {
  //       const fake = document.createElement("div");
  //       fake.style = `position:fixed; top:${payload.y}px; left:${payload.x}px; width:10px; height:10px; background:red; z-index:9999;`;
  //       document.body.appendChild(fake);
  //       setTimeout(() => fake.remove(), 500);
  //     }
  //   };
  // }
})();
