// WebSocket message types — shared between server and client
// Phase 2 will extend these types

export type WSMessageType =
  | "frame" // browser → server: video frame data (1 FPS)
  | "audio" // browser → server: user voice input
  | "coaching" // server → browser: Gemini Live coaching text
  | "annotation" // server → browser: annotated frame trigger
  | "tutorial"; // server → browser: YouTube URL + timestamp

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: number;
}

export interface FramePayload {
  data: string; // base64-encoded JPEG frame
  sessionId: string;
}

export interface CoachingPayload {
  text: string;
  tier: 1 | 2 | 3 | 4;
}
