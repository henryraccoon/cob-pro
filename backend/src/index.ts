import { hostname } from "os";
import { json } from "stream/consumers";
import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server started on ws://localhost:8080");
let snapshot: string;

const sessions = new Map(); //key: sessionId, value: {host, guests[]}

type ElType = { id: string; type: string };

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    //guest joined
    if (data.type === "join-session") {
      const { sessionId, guest_name } = data;
      console.log(`Guest ${guest_name} started cobrowsing session.`);
      if (snapshot) {
        console.log("sending guest snapshot");
        ws.send(snapshot);
      }
    }
    if (data.type === "snapshot") {
      // receiving snapshot and sending to guests
      console.log("snapshot received");
      const { sessionId } = data;
      const { html, width, height, url } = data.payload;

      const { host, guests } = sessions.get(sessionId);

      snapshot = JSON.stringify({
        type: "snapshot",
        sessionId,
        html,
        width,
        height,
        url,
      });

      console.log("sending snapshot...");
      if (guests.length > 0) {
        console.log("sending guest snapshot");
        for (const g of guests) {
          console.log("sent now");
          g.send(snapshot);
          console.log("sent.");
        }
      }
    }

    // replicating dom mutations
    if (data.type === "domMutation")
      console.log("dom mutation. snapshot received");

    // replicating event
    if (data.type === "event") console.log("event data received: ", data);

    // registering host and guest
    if (data.type === "register") {
      const { role, sessionId, cobIdArr = [] } = data;

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { host: null, guests: [] });
      }
      const session = sessions.get(sessionId);

      if (role === "host") {
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, { host: null, guests: [] });
        }
        session.host = ws;
        console.log("Host registered.");
      } else if (role === "guest") {
        session.guests.push(ws);
        console.log("Guest connected.");
        // console.log("added guest", session.guests);
        ws.send(
          JSON.stringify({
            type: "host-status",
            available: sessions.get(sessionId).host !== null,
          })
        );
        // console.log(
        //   JSON.stringify({
        //     type: "host-status",
        //     available: sessions.get(sessionId).host !== null,
        //   })
        // );
      }
    }
    //     const session = sessions.get(sessionId);
    // session?.guests.forEach((guest) => {
    //   if (guest.readyState === WebSocket.OPEN) {
    //     guest.send(JSON.stringify({ type: "your-message-type", payload: "Hello guest!" }));
    // }
    // });
    if (data.type === "leave") {
      const { role, sessionId } = data;

      if (role === "host") {
        console.log(
          `Host closed the window. Session ${sessionId} has ended at ${new Date().toLocaleTimeString()}.`
        );
        if (sessions.has(sessionId)) {
          sessions.delete(sessionId);
        }
      }

      if (role === "guest")
        console.log(
          `Guest disconnected at ${new Date().toLocaleTimeString()}.`
        );
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
    for (const [sessionId, session] of sessions.entries()) {
      session.guests = session.guests.filter((g: WebSocket) => g !== ws);
      if (session.host === ws) {
        console.log(`Host of session ${sessionId} disconnected`);
        sessions.delete(sessionId);
      }
    }

    // (Optional) Clean up sessions here if needed
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});
