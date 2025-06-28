import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server started on ws://localhost:8080");

const sessions = new Map(); //key: sessionId, value: {host, guests[]}

type ElType = { id: string; type: string };

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());
    console.log("Received message:", data);

    if (data.type === "register") {
      const { role, sessionId, cobIdArr = [] } = data;
      const elements = cobIdArr.map((el: ElType) => el.type).join(", ");
      if (sessionId) sessions.set(sessionId, { host: null, guests: [] });
      if (role === "host")
        console.log(
          "Host registered. Sessions: ",
          sessions,
          "Elements:",
          elements
        );
      if (role === "guest")
        console.log("Guest connected. Sessions: ", sessions);

      const session = sessions.get(sessionId);
      if (role === "host") session.host = ws;
      else session.guests.push(ws);
    }
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
