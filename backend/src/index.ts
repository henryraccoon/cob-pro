import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server started on ws://localhost:8080");

const sessions = new Map(); //key: sessionId, value: {host, guests[]}

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");
  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());
    console.log("Received message:", data);

    if (data.type === "register") {
      const { role, sessionId } = data;
      if (sessionId) sessions.set(sessionId, { host: null, guests: [] });
      console.log("sessions: ", sessions);

      const session = sessions.get(sessionId);
      if (role === "host") session.host = ws;
      else session.guests.push(ws);
      console.log("sessions2: ", sessions);
    }

    if (data.type === "event") {
      console.log("event data: ", data);
      const { sessionId, payload } = data;
      const session = sessions.get(sessionId);
      session.guests.forEach((g: any) =>
        g.send(JSON.stringify({ type: "event", payload }))
      );
    }
  });
  ws.on("close", () => {
    console.log("WebSocket disconnected");
    // (Optional) Clean up sessions here if needed
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});
