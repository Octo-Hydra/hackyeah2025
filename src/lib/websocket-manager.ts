/**
 * WebSocket Manager
 *
 * Manages WebSocket connections for real-time notifications
 * Handles reconnection, message routing, and connection lifecycle
 */

import type {
  WSMessage,
  WebSocketConnection,
  WSNotificationMessage,
  WSJourneyUpdateMessage,
  WSReputationMessage,
} from "@/types/store";

export type WSMessageHandler = (message: WSMessage) => void;

export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private messageHandlers: Map<string, Set<WSMessageHandler>> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new WebSocket connection
   */
  connect(
    id: string,
    url: string,
    options?: {
      maxReconnectAttempts?: number;
      reconnectDelay?: number;
    },
  ): void {
    // Close existing connection if any
    if (this.connections.has(id)) {
      this.disconnect(id);
    }

    const connection: WebSocketConnection = {
      id,
      url,
      socket: null,
      status: "connecting",
      reconnectAttempts: 0,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? 5,
      reconnectDelay: options?.reconnectDelay ?? 3000,
    };

    this.connections.set(id, connection);
    this.createSocket(connection);
  }

  /**
   * Create and configure the WebSocket
   */
  private createSocket(connection: WebSocketConnection): void {
    try {
      const socket = new WebSocket(connection.url);

      socket.onopen = () => {
        console.log(`[WS] Connected: ${connection.id}`);
        connection.status = "connected";
        connection.reconnectAttempts = 0;
        this.notifyStatusChange(connection);

        // Authenticate if user is logged in
        this.authenticateSocket(connection.id);
      };

      socket.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(connection.id, message);
        } catch (error) {
          console.error("[WS] Failed to parse message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error(`[WS] Error on ${connection.id}:`, error);
        connection.status = "error";
        this.notifyStatusChange(connection);
      };

      socket.onclose = () => {
        console.log(`[WS] Closed: ${connection.id}`);
        connection.status = "disconnected";
        connection.socket = null;
        this.notifyStatusChange(connection);

        // Attempt reconnection
        this.attemptReconnect(connection);
      };

      connection.socket = socket;
    } catch (error) {
      console.error(
        `[WS] Failed to create socket for ${connection.id}:`,
        error,
      );
      connection.status = "error";
      this.notifyStatusChange(connection);
      this.attemptReconnect(connection);
    }
  }

  /**
   * Attempt to reconnect a disconnected socket
   */
  private attemptReconnect(connection: WebSocketConnection): void {
    if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
      console.log(
        `[WS] Max reconnection attempts reached for ${connection.id}`,
      );
      return;
    }

    connection.reconnectAttempts++;
    const delay = connection.reconnectDelay * connection.reconnectAttempts;

    console.log(
      `[WS] Reconnecting ${connection.id} in ${delay}ms (attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`,
    );

    const timeout = setTimeout(() => {
      if (this.connections.has(connection.id)) {
        connection.status = "connecting";
        this.notifyStatusChange(connection);
        this.createSocket(connection);
      }
      this.reconnectTimeouts.delete(connection.id);
    }, delay);

    this.reconnectTimeouts.set(connection.id, timeout);
  }

  /**
   * Send authentication token to WebSocket server
   */
  private authenticateSocket(connectionId: string): void {
    const token = this.getAuthToken();
    if (token) {
      this.send(connectionId, {
        type: "auth",
        payload: { token },
      });
    }
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth-token");
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(connectionId: string, message: WSMessage): void {
    console.log(`[WS] Message from ${connectionId}:`, message.type);

    // Notify all handlers for this message type
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[WS] Handler error for ${message.type}:`, error);
        }
      });
    }

    // Notify global handlers
    const globalHandlers = this.messageHandlers.get("*");
    if (globalHandlers) {
      globalHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error("[WS] Global handler error:", error);
        }
      });
    }
  }

  /**
   * Notify handlers about connection status change
   */
  private notifyStatusChange(connection: WebSocketConnection): void {
    const message: WSMessage = {
      type: "connection:status",
      payload: {
        id: connection.id,
        status: connection.status,
        reconnectAttempts: connection.reconnectAttempts,
      },
    };

    this.handleMessage(connection.id, message);
  }

  /**
   * Send a message through a WebSocket connection
   */
  send(connectionId: string, message: WSMessage): boolean {
    const connection = this.connections.get(connectionId);

    if (!connection || !connection.socket) {
      console.warn(`[WS] Cannot send, connection not found: ${connectionId}`);
      return false;
    }

    if (connection.socket.readyState !== WebSocket.OPEN) {
      console.warn(
        `[WS] Cannot send, socket not open: ${connectionId} (state: ${connection.socket.readyState})`,
      );
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WS] Failed to send message on ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to messages of a specific type
   */
  subscribe(messageType: string, handler: WSMessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    const handlers = this.messageHandlers.get(messageType)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(messageType);
      }
    };
  }

  /**
   * Disconnect a WebSocket connection
   */
  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear reconnect timeout
    const timeout = this.reconnectTimeouts.get(connectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(connectionId);
    }

    // Close socket
    if (connection.socket) {
      connection.socket.close();
      connection.socket = null;
    }

    this.connections.delete(connectionId);
    console.log(`[WS] Disconnected: ${connectionId}`);
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    this.connections.forEach((_, id) => {
      this.disconnect(id);
    });
  }

  /**
   * Get connection status
   */
  getStatus(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) ?? null;
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Check if connected
   */
  isConnected(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    return connection?.status === "connected" && connection.socket !== null;
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (typeof window === "undefined") {
    throw new Error("WebSocketManager can only be used in browser environment");
  }

  if (!wsManager) {
    wsManager = new WebSocketManager();
  }

  return wsManager;
}

// Helper functions for common operations

export function sendNotificationReport(
  connectionId: string,
  report: WSNotificationMessage["payload"],
): boolean {
  const manager = getWebSocketManager();
  return manager.send(connectionId, {
    type: "report:submit",
    payload: report,
  });
}

export function confirmNotificationReport(
  connectionId: string,
  notificationId: string,
  userId: string,
): boolean {
  const manager = getWebSocketManager();
  return manager.send(connectionId, {
    type: "report:confirm",
    payload: { notificationId, userId },
  });
}

export function updateJourney(
  connectionId: string,
  journey: WSJourneyUpdateMessage["payload"]["journey"],
  userId: string,
): boolean {
  const manager = getWebSocketManager();
  return manager.send(connectionId, {
    type: "journey:update",
    payload: { userId, journey },
  });
}

export function resolveNotification(
  connectionId: string,
  notificationId: string,
  wasCorrect: boolean,
): boolean {
  const manager = getWebSocketManager();
  return manager.send(connectionId, {
    type: "notification:resolve",
    payload: { notificationId, wasCorrect },
  });
}
