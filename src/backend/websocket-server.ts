/**
 * WebSocket Server for Real-Time Notifications
 *
 * This server handles WebSocket connections and routes messages
 * for the notification system
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type {
  WSMessage,
  NotificationReport,
  OfficialNotification,
} from "@/types/store";
import {
  calculateThreshold,
  DEFAULT_THRESHOLD_CONFIG,
} from "@/lib/threshold-algorithm";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface StoredNotification extends NotificationReport {
  reporterDetails: Map<string, { reputation: number; timestamp: Date }>;
}

export class NotificationWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private notifications: Map<string, StoredNotification> = new Map();
  private userReputations: Map<string, number> = new Map();

  constructor(server?: any) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
    });

    this.setupServer();
    this.startHeartbeat();
  }

  private setupServer(): void {
    this.wss.on(
      "connection",
      (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
        console.log("[WS Server] New connection");

        ws.isAlive = true;

        // Handle pong responses
        ws.on("pong", () => {
          ws.isAlive = true;
        });

        ws.on("message", (data: Buffer) => {
          try {
            const message: WSMessage = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (error) {
            console.error("[WS Server] Failed to parse message:", error);
          }
        });

        ws.on("close", () => {
          this.handleDisconnect(ws);
        });

        ws.on("error", (error) => {
          console.error("[WS Server] WebSocket error:", error);
        });
      },
    );
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WSMessage): void {
    switch (message.type) {
      case "auth":
        this.handleAuth(ws, message);
        break;

      case "report:submit":
        this.handleReportSubmit(ws, message);
        break;

      case "report:confirm":
        this.handleReportConfirm(ws, message);
        break;

      case "journey:update":
        this.handleJourneyUpdate(ws, message);
        break;

      case "journey:end":
        this.handleJourneyEnd(ws, message);
        break;

      case "notification:resolve":
        this.handleNotificationResolve(ws, message);
        break;

      default:
        console.log(`[WS Server] Unknown message type: ${message.type}`);
    }
  }

  private handleAuth(ws: AuthenticatedWebSocket, message: WSMessage): void {
    const { token } = message.payload as { token: string };

    // TODO: Verify token with your authentication system
    // For now, extract userId from token (in production, verify JWT)
    const userId = this.extractUserIdFromToken(token);

    if (userId) {
      ws.userId = userId;
      this.clients.set(userId, ws);

      // Load user reputation from database
      // For now, use default value
      if (!this.userReputations.has(userId)) {
        this.userReputations.set(userId, 50);
      }

      this.sendToClient(ws, {
        type: "auth:success",
        payload: { userId, reputation: this.userReputations.get(userId) },
      });

      console.log(`[WS Server] User authenticated: ${userId}`);
    } else {
      this.sendToClient(ws, {
        type: "auth:failed",
        payload: { message: "Invalid token" },
      });
    }
  }

  private handleReportSubmit(
    ws: AuthenticatedWebSocket,
    message: WSMessage,
  ): void {
    if (!ws.userId) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    const report = message.payload as NotificationReport;

    // Create stored notification with reporter details
    const storedNotification: StoredNotification = {
      ...report,
      reportedBy: ws.userId,
      reporterReputation: this.userReputations.get(ws.userId) || 50,
      reporterDetails: new Map([
        [
          ws.userId,
          {
            reputation: this.userReputations.get(ws.userId) || 50,
            timestamp: new Date(),
          },
        ],
      ]),
    };

    this.notifications.set(report.id, storedNotification);

    // Broadcast to all users on the same line
    this.broadcastToLine(report.lineId, {
      type: "notification:new",
      payload: report,
    });

    console.log(`[WS Server] New report submitted: ${report.id}`);
  }

  private handleReportConfirm(
    ws: AuthenticatedWebSocket,
    message: WSMessage,
  ): void {
    if (!ws.userId) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    const { notificationId } = message.payload as {
      userId: string;
      notificationId: string;
    };

    const notification = this.notifications.get(notificationId);
    if (!notification) {
      this.sendError(ws, "Notification not found");
      return;
    }

    // Check if user already confirmed
    if (notification.reporterDetails.has(ws.userId)) {
      this.sendError(ws, "Already confirmed");
      return;
    }

    // Add user confirmation
    const userReputation = this.userReputations.get(ws.userId) || 50;
    notification.reporterDetails.set(ws.userId, {
      reputation: userReputation,
      timestamp: new Date(),
    });

    notification.supportingReports.push(ws.userId);
    notification.totalReputation += userReputation;

    // Check if should become official
    const reputations = Array.from(notification.reporterDetails.values()).map(
      (d) => d.reputation,
    );

    const threshold = calculateThreshold(
      notification.reporterDetails.size,
      notification.totalReputation,
      reputations,
      DEFAULT_THRESHOLD_CONFIG,
    );

    if (threshold.isOfficial && notification.status === "PENDING") {
      // Promote to official
      notification.status = "OFFICIAL";
      notification.incidentId = `incident-${Date.now()}`;

      const officialNotification: OfficialNotification = {
        id: notification.id,
        incidentId: notification.incidentId,
        title: notification.title,
        description: notification.description,
        kind: notification.kind,
        lineId: notification.lineId,
        lineName: notification.lineName,
        location: notification.location,
        reportCount: notification.reporterDetails.size,
        totalReputation: notification.totalReputation,
        contributingUsers: Array.from(notification.reporterDetails.keys()),
        createdAt: notification.timestamp,
        status: "ACTIVE",
      };

      // Broadcast official notification
      this.broadcastToAll({
        type: "notification:official",
        payload: officialNotification,
      });

      console.log(
        `[WS Server] Notification became official: ${notification.id}`,
      );
    } else {
      // Just update the notification
      this.broadcastToLine(notification.lineId, {
        type: "notification:update",
        payload: notification,
      });
    }
  }

  private handleJourneyUpdate(
    ws: AuthenticatedWebSocket,
    message: WSMessage,
  ): void {
    if (!ws.userId) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    // Store journey info (could persist to database)
    console.log(`[WS Server] Journey updated for user: ${ws.userId}`);

    // Could broadcast to friends/followers if needed
  }

  private handleJourneyEnd(
    ws: AuthenticatedWebSocket,
    message: WSMessage,
  ): void {
    if (!ws.userId) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    console.log(`[WS Server] Journey ended for user: ${ws.userId}`);
  }

  private handleNotificationResolve(
    ws: AuthenticatedWebSocket,
    message: WSMessage,
  ): void {
    if (!ws.userId) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    // TODO: Check if user is moderator/admin

    const { notificationId, wasCorrect } = message.payload as {
      notificationId: string;
      wasCorrect: boolean;
    };

    const notification = this.notifications.get(notificationId);
    if (!notification) {
      this.sendError(ws, "Notification not found");
      return;
    }

    // Calculate reputation changes
    const notificationAge = Math.floor(
      (Date.now() - notification.timestamp.getTime()) / 60000,
    );

    notification.reporterDetails.forEach((details, userId) => {
      // Simplified reputation calculation
      const baseChange = wasCorrect ? 10 : -5;
      const timeBonus =
        wasCorrect && notificationAge < 10
          ? 1 + (10 - notificationAge) / 10
          : 1;
      const change = Math.round(baseChange * timeBonus);

      // Update reputation
      const currentRep = this.userReputations.get(userId) || 50;
      const newRep = Math.max(0, currentRep + change);
      this.userReputations.set(userId, newRep);

      // Send reputation update to user
      const userWs = this.clients.get(userId);
      if (userWs) {
        this.sendToClient(userWs, {
          type: "reputation:update",
          payload: {
            userId,
            change,
            reason: wasCorrect
              ? `Correct report: ${notification.title}`
              : `Incorrect report: ${notification.title}`,
            notificationId,
            timestamp: new Date(),
          },
        });
      }
    });

    // Remove notification
    this.notifications.delete(notificationId);

    // Broadcast resolution
    this.broadcastToAll({
      type: "notification:resolved",
      payload: { notificationId, wasCorrect },
    });

    console.log(
      `[WS Server] Notification resolved: ${notificationId} (${wasCorrect ? "correct" : "incorrect"})`,
    );
  }

  private handleDisconnect(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      this.clients.delete(ws.userId);
      console.log(`[WS Server] User disconnected: ${ws.userId}`);
    }
  }

  private sendToClient(ws: AuthenticatedWebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: AuthenticatedWebSocket, error: string): void {
    this.sendToClient(ws, {
      type: "error",
      payload: { message: error },
    });
  }

  private broadcastToAll(message: WSMessage): void {
    this.clients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  private broadcastToLine(lineId: string, message: WSMessage): void {
    // In a real implementation, you'd track which users are on which lines
    // For now, broadcast to all
    this.broadcastToAll(message);
  }

  private startHeartbeat(): void {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as AuthenticatedWebSocket;

        if (client.isAlive === false) {
          this.handleDisconnect(client);
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on("close", () => {
      clearInterval(interval);
    });
  }

  private extractUserIdFromToken(token: string): string | null {
    // TODO: Implement proper JWT verification
    // For development, you can decode the token
    try {
      // Simple base64 decode (NOT SECURE, just for demo)
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        return payload.sub || payload.userId || null;
      }
    } catch {
      // Token parsing failed
    }
    return null;
  }

  public close(): void {
    this.wss.close();
  }
}

// Export singleton instance
let wsServer: NotificationWebSocketServer | null = null;

export function initializeWebSocketServer(
  server: any,
): NotificationWebSocketServer {
  if (wsServer) {
    return wsServer;
  }

  wsServer = new NotificationWebSocketServer(server);
  console.log("[WS Server] WebSocket server initialized");

  return wsServer;
}

export function getWebSocketServer(): NotificationWebSocketServer | null {
  return wsServer;
}
