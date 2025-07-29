(function () {
  const ws = new WebSocket("ws://localhost:8080");
  const sessionId = "session1";
  const isHost = true;
  type ElType = { id: string; type: string };

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
      console.log("sending resize");
      sendSafely(data);
    });

    document.addEventListener("scroll", (e) => {
      const data = {
        type: "event",
        sessionId,
        payload: {
          action: "scroll",
          target: "window",
          //possibly target might be different, dropdown etc
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
      };
      console.log("sending scroll");
      sendSafely(data);
    });

    document.addEventListener("mousemove", (e) => {
      const data = {
        type: "event",
        sessionId,
        payload: { action: "mousemove", x: e.clientX, y: e.clientY },
      };

      sendSafely(data);
    });

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
      console.log("sending input");
      sendSafely(data);
    });

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
        console.log("sending change");
        sendSafely({ type: "event", sessionId, payload });
      });
    });

    document.addEventListener("change", (e) => {
      const el = e.target as HTMLSelectElement;
      const payload = {
        action: "select",
        target: el.getAttribute("data-cob-id"),
        value: el.value,
      };
      console.log("sending change2");
      sendSafely({ type: "event", sessionId, payload });
    });

    document.addEventListener("click", (e) => {
      const data = {
        type: "event",
        sessionId,
        payload: { action: "click", x: e.clientX, y: e.clientY },
      };
      console.log("sending click");
      sendSafely(data);
    });

    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a") as HTMLAnchorElement;
      if (anchor && anchor.href) {
        const payload = {
          action: "link-click",
          href: anchor.href,
          target: anchor.getAttribute("data-cob-id") || null,
        };
        sendSafely({ type: "event", sessionId, payload });
      }
    });

    //should add values that are breing submitted
    document.addEventListener("submit", (e) => {
      const target = e.target as HTMLInputElement;
      const cobId = target.getAttribute("data-cob-id");
      const data = {
        type: "event",
        sessionId,
        payload: { action: "submit", target: cobId },
      };
      sendSafely(data);
    });
  }

  //not sure if this works
  // document.querySelectorAll("select").forEach((select) => {
  //   const cobId = select.getAttribute("data-cob-id");

  //   select.addEventListener("focus", () => {
  //     ws.send(
  //       JSON.stringify({
  //         type: "event",
  //         sessionId,
  //         payload: { action: "select-open", target: cobId },
  //       })
  //     );
  //   });
  // });

  // document.addEventListener("focusin", (e) => {
  //   const el = e.target as HTMLElement;
  //   if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
  //     const cobId = el.getAttribute("data-cob-id");
  //     if (cobId) {
  //       ws.send(
  //         JSON.stringify({
  //           type: "event",
  //           sessionId,
  //           payload: {
  //             action: "focus",
  //             target: cobId,
  //           },
  //         })
  //       );
  //     }
  //   }
  // });

  // TODO
  // if (isHost) {
  //   document.querySelectorAll("input, textarea").forEach((el) => {
  //     el.addEventListener("select", (e) => {
  //       const input = e.target as HTMLInputElement | HTMLTextAreaElement;
  //       const payload = {
  //         action: "text-selection",
  //         target: input.getAttribute("data-cob-id"),
  //         selectionStart: input.selectionStart,
  //         selectionEnd: input.selectionEnd,
  //         value: input.value,
  //       };
  //       ws.send(JSON.stringify({ type: "event", sessionId, payload }));
  //     });
  //   });
  // }

  window.addEventListener("beforeunload", () => {
    ws.send(
      JSON.stringify({
        type: "leave",
        role: isHost ? "host" : "guest",
        sessionId,
        time: new Date().toLocaleTimeString(),
      })
    );
    registered = false;
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
    registered = false;
  };
})();
