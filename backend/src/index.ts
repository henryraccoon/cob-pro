import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });

const sessions = new Map(); //key: sessionId, value: {host, guests[]}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === "register") {
      const { role, sessionId } = data;
      if (!sessionId.has(sessionId))
        sessions.set(sessionId, { host: null, guests: [] });

      const session = sessions.get(sessionId);
      if (role === "host") session.host = ws;
      else session.guests.push(ws);
    }

    if (data.type === "event") {
      const { sessionId, payload } = data;
      const session = sessions.get(sessionId);
      session.guests.forEach((g) =>
        g.send(JSON.stringify({ type: "event", payload }))
      );
    }
  });
});
