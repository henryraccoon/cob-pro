import { hostname } from "os";
import { json } from "stream/consumers";
import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server started on ws://localhost:8080");
let snapshot: string;

const sessions = new Map(); //key: sessionId, value: {host, guests[]}

type ElType = { id: string; type: string };
type GuestType = { socket: WebSocket; name: string };

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === "join-session") {
      const { sessionId, guest_name } = data;
      const currentSession = sessions.get(sessionId);

      const updatedGuests = currentSession?.guests || [];
      updatedGuests.push({ socket: ws, name: guest_name });
      sessions.set(sessionId, {
        ...currentSession,
        guests: updatedGuests,
      });
      console.log(`Guest ${guest_name} started cobrowsing session.`);
      if (snapshot) {
        console.log("sending guest snapshot");
        ws.send(snapshot);
      }
    }
    if (data.type === "snapshot") {
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

      if (guests.length > 0) {
        for (const g of guests) {
          g.socket.send(snapshot);
        }
      }
    }

    // replicating event
    if (data.type === "event") {
      const { sessionId, payload } = data;

      if (
        payload.action === "scroll" ||
        payload.action === "resize" ||
        payload.action === "select" ||
        payload.action === "select-open" ||
        payload.action === "input" ||
        payload.action === "focus" ||
        payload.action === "click" ||
        payload.action === "mousemove"
      ) {
        const { host, guests } = sessions.get(sessionId);
        if (guests.length > 0) {
          console.log(`sending guest event data (${payload.action})`);
          for (const g of guests) {
            g.socket.send(JSON.stringify(data));
          }
        }
      }
    }

    if (data.type === "register") {
      const { role, sessionId, name, cobIdArr = [] } = data;

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { host: null, guests: [] });
      }
      const session = sessions.get(sessionId);

      if (role === "host") {
        session.host = { socket: ws, name: data.name };
        console.log("Host registered.");
      } else if (role === "guest") {
        session.guests.push({ socket: ws, name: data.name });
        console.log("Guest connected.");
        ws.send(
          JSON.stringify({
            type: "host-status",
            available: sessions.get(sessionId).host.name !== null,
          })
        );
      }
    }

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
        if (sessions.has(sessionId)) {
          const { sessionId, name } = data;
          const currentSession = sessions.get(sessionId);

          const updatedGuests = currentSession?.guests || [];
          updatedGuests.filter((g: GuestType) => g.name !== name);
          sessions.set(sessionId, {
            ...currentSession,
            guests: updatedGuests,
          });
        }
      console.log(`Guest disconnected at ${new Date().toLocaleTimeString()}.`);
    }
  });
  ws.on("close", () => {
    console.log("WebSocket disconnected");
    for (const [sessionId, session] of sessions.entries()) {
      session.guests = session.guests.filter((g: GuestType) => g.socket !== ws);
      if (session.host?.socket === ws) {
        console.log(`Host of session ${sessionId} disconnected`);
        sessions.delete(sessionId);
      }
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});
