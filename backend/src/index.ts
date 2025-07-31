import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server started on ws://localhost:8080");
let snapshot: string;

type SessionType = {
  host: { name: string; socket: WebSocket };
  guests: { name: string; socket: WebSocket }[];
};

//TODO: after disconnecting don't wipe out whole session.
//TODO: implement separate registering guests and actually starting cobrowsing
//TODO: fix wrong cursor render before resize
//TODO: maybe add time out for both host and guest for reloads accidental reconnects

const sessions = new Map(); //key: sessionId, value: {host, guests[]}

type ElType = { id: string; type: string };
type GuestType = { socket: WebSocket; name: string };

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

      const allowedActions = [
        "scroll",
        "resize",
        "select",
        "select-open",
        "input",
        "focus",
        "click",
        "mousemove",
      ];

      if (allowedActions.includes(payload.action)) {
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
        if (session.guests.length > 0) {
          session.guests.forEach((g: GuestType) =>
            sendHostStatus(g.socket, true)
          );
        }
        console.log("Host registered.");
      } else if (role === "guest") {
        const alreadyConnected = session.guests.some(
          (g: GuestType) => g.socket === ws || g.name === data.name
        );
        if (!alreadyConnected) {
          session.guests.push({ socket: ws, name: data.name });
          console.log("Guest connected.");
        } else {
          console.log("Dublicate/reconected guest ignored");
        }
        const host = sessions.get(sessionId)?.host;
        const hostAvailable = host !== null && host !== undefined;
        sendHostStatus(ws, hostAvailable);
      }
    }

    if (data.type === "leave") {
      const { role, sessionId, name } = data;

      if (role === "host") {
        const session = sessions.get(sessionId);
        if (session.guests.length > 0)
          session.guests.forEach((g: GuestType) =>
            sendHostStatus(g.socket, false)
          );
        console.log(
          `Host ${name} closed the window at ${new Date().toLocaleTimeString()}.`
        );
        session.host = null;
      }

      if (role === "guest" && sessions.has(sessionId)) {
        const currentSession = sessions.get(sessionId);

        const updatedGuests = currentSession?.guests || [];
        const newGuests = updatedGuests.filter(
          (g: GuestType) => g.name !== name
        );
        sessions.set(sessionId, {
          ...currentSession,
          guests: newGuests,
        });
      }
      console.log(
        `Guest ${name} disconnected at ${new Date().toLocaleTimeString()}.`
      );
    }
  });
  ws.on("close", () => {
    console.log("WebSocket disconnected");
    for (const [sessionId, session] of sessions.entries()) {
      if (session.host?.socket === ws) {
        if (session.guests.length > 0)
          session.guests.forEach((g: GuestType) =>
            sendHostStatus(g.socket, false)
          );
        console.log(
          `Host ${session.host.name} of session ${sessionId} disconnected`
        );
        session.host = null;
      }

      const updatedGuests = session.guests.filter(
        (g: GuestType) => g.socket !== ws
      );
      sessions.set(sessionId, { ...session, guests: updatedGuests });

      if (!session.host && session.guests.length === 0) {
        sessions.delete(sessionId);
        console.log(`Session ${sessionId} fully cleaned up`);
      }
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});
