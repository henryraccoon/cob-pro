//TODO: after disconnecting don't wipe out whole session.
//TODO: implement separate registering guests and actually starting cobrowsing
//TODO: fix wrong cursor render before resize
//TODO: maybe add time out for both host and guest for reloads accidental reconnects

import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server started on ws://localhost:8080");

let snapshot: string;

type GuestType = { socket: WebSocket; name: string };
type SessionType = {
  host: { name: string; socket: WebSocket } | null;
  guests: GuestType[];
};

const sessions = new Map<string, SessionType>();

function sendHostStatus(guestSocket: WebSocket, available: boolean) {
  guestSocket.send(
    JSON.stringify({
      type: "host-status",
      available,
    })
  );
}

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    // --- Join Session ---
    if (data.type === "join-session") {
      const { sessionId, guest_name } = data;
      const currentSession = sessions.get(sessionId) || {
        host: null,
        guests: [],
      };
      let existing = currentSession.guests.find((g) => g.name === guest_name);

      if (!existing) {
        currentSession.guests.push({ socket: ws, name: guest_name });
        sessions.set(sessionId, currentSession);
      } else {
        existing.socket = ws;
      }
      // Notify host that viewer connected
      if (currentSession.host?.socket) {
        currentSession.host.socket.send(
          JSON.stringify({
            type: "guest-started-cobrowsing",
            name: guest_name,
          })
        );
      }
      console.log(`Guest ${guest_name} started cobrowsing session.`);
    }

    if (snapshot) {
      ws.send(snapshot);
    }

    // --- Snapshot ---
    if (data.type === "snapshot") {
      const { sessionId, payload } = data;
      const { html, width, height, url } = payload;
      const { guests } = sessions.get(sessionId) || { guests: [] };

      snapshot = JSON.stringify({
        type: "snapshot",
        sessionId,
        html,
        width,
        height,
        url,
      });
      guests.forEach((g) => g.socket.send(snapshot));
    }

    // --- Event Replication ---
    if (data.type === "event") {
      const { sessionId, payload } = data;
      if (
        [
          "scroll",
          "resize",
          "select",
          "select-open",
          "input",
          "focus",
          "click",
          "mousemove",
        ].includes(payload.action)
      ) {
        const { guests } = sessions.get(sessionId) || { guests: [] };
        guests.forEach((g) => g.socket.send(JSON.stringify(data)));
      }
    }

    // --- Register ---
    if (data.type === "register") {
      const { role, sessionId, name } = data;
      if (!sessions.has(sessionId))
        sessions.set(sessionId, { host: null, guests: [] });
      const session = sessions.get(sessionId)!;

      if (role === "host") {
        if (session.host?.socket === ws) return;
        session.host = { socket: ws, name };
        // Notify all guests that host is online
        session.guests.forEach((g) => sendHostStatus(g.socket, true));
        console.log(`Host ${name} registered.`);
      } else if (role === "guest") {
        if (!session.guests.find((g) => g.name === name)) {
          session.guests.push({ socket: ws, name });
        }
        console.log(`Guest ${name} registered.`);
        if (session.host?.socket) {
          session.host?.socket.send(
            JSON.stringify({ type: "viewer-connected", name })
          );
        }
        sendHostStatus(ws, !!session.host);
      }
    }

    // --- Leave ---
    if (data.type === "leave") {
      const { role, sessionId, name } = data;
      const session = sessions.get(sessionId);
      if (!session) return;

      if (role === "host") {
        session.host = null;
        session.guests.forEach((g) => sendHostStatus(g.socket, false));
        console.log(
          `Host ${name} closed the window at ${new Date().toLocaleTimeString()}.`
        );
      }

      if (role === "guest") {
        session.guests = session.guests.filter((g) => g.name !== name);
        if (session.host?.socket) {
          session.host.socket.send(
            JSON.stringify({
              type: "viewer-disconnected",
              name,
            })
          );
        }

        console.log(
          `Guest ${name} disconnected at ${new Date().toLocaleTimeString()}.`
        );
        sessions.set(sessionId, session);
      }
    }

    // --- Kick Viewer (NEW) ---
    if (data.type === "kick-viewer") {
      const { sessionId, guestName } = data;
      const session = sessions.get(sessionId);
      if (!session || session.host?.socket !== ws) return; // Security check

      const guest = session.guests.find((g) => g.name === guestName);
      if (guest) {
        guest.socket.send(
          JSON.stringify({
            type: "session-ended",
            reason: "Host ended cobrowsing session.",
          })
        );
        guest.socket.close();

        session.guests = session.guests.filter((g) => g.name !== guestName);
        session.host.socket.send(
          JSON.stringify({
            type: "viewer-disconnected",
            name: guestName,
          })
        );
      }
    }
  });

  ws.on("close", () => {
    for (const [sessionId, session] of sessions.entries()) {
      if (session.host?.socket === ws) {
        session.host = null;
        session.guests.forEach((g) => sendHostStatus(g.socket, false));
        console.log(
          `Host closed the window at ${new Date().toLocaleTimeString()}.`
        );
      } else {
        session.guests = session.guests.filter((g) => g.socket !== ws);
        console.log(
          `Guest disconnected at ${new Date().toLocaleTimeString()}.`
        );
      }
      if (!session.host && session.guests.length === 0) {
        console.log("No host and 0 guests. Deleteing session...");
        sessions.delete(sessionId);
        console.log("Session fully cleaned.");
      }
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});
