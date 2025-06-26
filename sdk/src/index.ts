(function () {
  const ws = new WebSocket("ws://localhost:8080");
  const sessionId = "session1";
  const isHost = true;

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        type: "register",
        role: isHost ? "host" : "guest",
        sessionId,
      })
    );
  };

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
