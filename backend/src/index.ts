import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server started on ws://localhost:8080");

const sessions = new Map(); //key: sessionId, value: {host, guests[]}

type ElType = { id: string; type: string };

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === "snapshot") console.log("snapshot received");
    if (data.type === "domMutation")
      console.log("dom mutation. snapshot received");
    if (data.type === "event") console.log("event data received: ", data);
    if (data.type === "register") {
      const { role, sessionId, cobIdArr = [] } = data;

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { host: null, guests: [] });
      }
      const session = sessions.get(sessionId);

      if (role === "host") {
        sessions.set(sessionId, { host: ws, guests: [] });
        console.log("Host registered.");
      } else if (role === "guest") {
        session.guests.push(ws);
        console.log("Guest connected.");
        ws.send(
          JSON.stringify({
            type: "host-status",
            available: sessions.get(sessionId).host !== null,
          })
        );
        console.log(
          JSON.stringify({
            type: "host-status",
            available: sessions.get(sessionId).host !== null,
          })
        );
      }
    }
    //     const session = sessions.get(sessionId);
    // session?.guests.forEach((guest) => {
    //   if (guest.readyState === WebSocket.OPEN) {
    //     guest.send(JSON.stringify({ type: "your-message-type", payload: "Hello guest!" }));
    // }
    // });
    if (data.type === "leave") {
      const { role, sessionId, time } = data;

      if (role === "host") {
        console.log(
          `Host closed the window. Session ${sessionId} has ended at ${time}.`
        );
        if (sessions.has(sessionId)) {
          sessions.delete(sessionId);
        }
      }

      if (role === "guest") console.log(`Guest disconnected at ${time}.`);
    }

    // if (data.type === "event") {
    //   console.log("event data: ", data);
    //   const { sessionId, payload } = data;
    //   const session = sessions.get(sessionId);
    //   session.guests.forEach((g: any) =>
    //     g.send(JSON.stringify({ type: "event", payload }))
    //   );
    // }
  });
  ws.on("close", () => {
    console.log("WebSocket disconnected");
    // (Optional) Clean up sessions here if needed
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});
