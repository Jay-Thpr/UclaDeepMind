import { WebSocketServer, WebSocket } from "ws";
import { config } from "dotenv";

// TODO: set WS_PORT in .env.local (default: 3001)
config({ path: ".env.local" });

const PORT = parseInt(process.env.WS_PORT ?? "3001", 10);

const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`[ws] WebSocket server listening on port ${PORT}`);
});

wss.on("connection", (ws: WebSocket) => {
  console.log("[ws] Client connected");

  ws.on("message", (data: Buffer) => {
    // Phase 2: wire to Gemini Live here
    console.log("[ws] Received message, length:", data.byteLength);
  });

  ws.on("close", () => {
    console.log("[ws] Client disconnected");
  });

  ws.on("error", (err: Error) => {
    console.error("[ws] Error:", err.message);
  });
});

export { wss };
