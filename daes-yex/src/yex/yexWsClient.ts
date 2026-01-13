import WebSocket from "ws";
import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}




import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}




import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}




import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}




import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}




import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}




import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}



import type { Logger } from "../types.js";
import { tryGunzip } from "../utils/gzip.js";

type WsHandler = (msg: any) => void;
type WsErrorHandler = (error: Error) => void;
type WsStateHandler = () => void;

export interface YexWsOptions {
  url: string;
  logger: Logger;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

/**
 * YEX WebSocket Client
 * 
 * Features:
 * - Decode gzip messages
 * - Auto-respond to {"ping": ...} with {"pong": ...}
 * - Subscribe/unsubscribe to channels
 * - Auto-reconnect on disconnect
 * - Request historical data
 */
export class YexWsClient {
  private ws?: WebSocket;
  private handlers: WsHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private openHandlers: WsStateHandler[] = [];
  private closeHandlers: WsStateHandler[] = [];
  private isClosedByUser = false;
  private pingInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();

  constructor(private opts: YexWsOptions) {}

  /**
   * Registra un handler para mensajes recibidos
   */
  onMessage(handler: WsHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Registra un handler para errores
   */
  onError(handler: WsErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se abre la conexión
   */
  onOpen(handler: WsStateHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Registra un handler para cuando se cierra la conexión
   */
  onClose(handler: WsStateHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    this.isClosedByUser = false;
    this.open();
  }

  /**
   * Cierra la conexión
   */
  close(): void {
    this.isClosedByUser = true;
    this.stopPing();
    this.ws?.close();
  }

  /**
   * Suscribe a un canal
   * @param channel Nombre del canal (e.g., "market_BTCUSDT_ticker")
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ sub: channel });
  }

  /**
   * Desuscribe de un canal
   * @param channel Nombre del canal
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ unsub: channel });
  }

  /**
   * Solicita datos históricos
   * @param channel Canal a solicitar
   * @param id ID opcional para la solicitud
   */
  request(channel: string, id = String(Date.now())): void {
    this.send({ req: channel, id });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene las suscripciones activas
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private open(): void {
    const { url, logger } = this.opts;
    logger.info("WS connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      logger.info("WS open");
      this.startPing();
      
      // Re-suscribir a canales previos
      for (const channel of this.subscriptions) {
        this.send({ sub: channel });
      }
      
      for (const h of this.openHandlers) {
        try { h(); } catch (e) { logger.error("WS open handler error", { error: String(e) }); }
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn("WS close", { code, reason: reason?.toString?.() });
      this.stopPing();
      
      for (const h of this.closeHandlers) {
        try { h(); } catch (e) { logger.error("WS close handler error", { error: String(e) }); }
      }
      
      if (!this.isClosedByUser && this.opts.autoReconnect !== false) {
        const d = this.opts.reconnectDelayMs ?? 1500;
        logger.info("WS reconnecting in", { delayMs: d });
        setTimeout(() => this.open(), d);
      }
    });

    ws.on("error", (err) => {
      logger.error("WS error", { err: String((err as any)?.message || err) });
      for (const h of this.errorHandlers) {
        try { h(err as Error); } catch (e) { logger.error("WS error handler error", { error: String(e) }); }
      }
    });

    ws.on("message", (data) => {
      try {
        // ws lib puede darte Buffer o string
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        
        // Intentar decodificar (puede ser gzip o plain JSON)
        const text = tryGunzip(buf);
        const parsed = JSON.parse(text);
        
        this.handleParsed(parsed);
      } catch (e: any) {
        logger.warn("WS message parse failed", { err: String(e?.message || e) });
      }
    });
  }

  private handleParsed(parsed: any): void {
    // Heartbeat: responder a ping con pong
    if (parsed && typeof parsed === "object" && parsed.ping !== undefined) {
      this.send({ pong: parsed.ping });
      return;
    }
    
    // Notificar a handlers
    for (const h of this.handlers) {
      try {
        h(parsed);
      } catch (e) {
        this.opts.logger.error("WS message handler error", { error: String(e) });
      }
    }
  }

  private send(payload: any): void {
    const s = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    }
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ ping: Date.now() });
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
}





