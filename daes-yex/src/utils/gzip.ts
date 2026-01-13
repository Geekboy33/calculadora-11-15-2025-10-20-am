import { gunzipSync, gzipSync } from "node:zlib";

export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}





export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}





export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}





export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}





export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}





export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}





export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}




export function gunzipToString(data: Buffer): string {
  return gunzipSync(data).toString("utf8");
}

export function gzipFromString(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf8"));
}

export function isGzipped(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function tryGunzip(data: Buffer): string {
  if (isGzipped(data)) {
    return gunzipToString(data);
  }
  return data.toString("utf8");
}





