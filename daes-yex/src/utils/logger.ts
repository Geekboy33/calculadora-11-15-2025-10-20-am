import type { Logger } from "../types.js";
import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};




import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};




import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};




import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};




import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};




import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};




import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};



import type { LogLevel } from "../config.js";

const levels: Record<LogLevel, number> = { 
  debug: 10, 
  info: 20, 
  warn: 30, 
  error: 40 
};

export function createLogger(level: LogLevel): Logger {
  const min = levels[level] ?? 20;
  const should = (l: LogLevel) => (levels[l] ?? 999) >= min;

  const fmt = (msg: string, meta?: any) => {
    if (meta === undefined) return msg;
    try { 
      return `${msg} | ${JSON.stringify(meta)}`; 
    } catch { 
      return `${msg} | [meta]`; 
    }
  };

  const timestamp = () => new Date().toISOString();

  return {
    debug: (m, meta) => {
      if (should("debug")) {
        console.log(`[${timestamp()}] [DEBUG] ${fmt(m, meta)}`);
      }
    },
    info: (m, meta) => {
      if (should("info")) {
        console.log(`[${timestamp()}] [INFO] ${fmt(m, meta)}`);
      }
    },
    warn: (m, meta) => {
      if (should("warn")) {
        console.warn(`[${timestamp()}] [WARN] ${fmt(m, meta)}`);
      }
    },
    error: (m, meta) => {
      if (should("error")) {
        console.error(`[${timestamp()}] [ERROR] ${fmt(m, meta)}`);
      }
    },
  };
}

// Console logger sin nivel (siempre loguea todo)
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// Null logger (no loguea nada)
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};





