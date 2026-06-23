/**
 * Local UI sink — serves a canvas viewer over HTTP and streams the
 * framebuffer to connected WebSocket clients.
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { Sink } from './types';

export interface LocalUiSinkConfig {
  /** HTTP port for the viewer. Default 8090. */
  port?: number;
  /** HTML content for the viewer page. */
  html?: string;
}

const DEFAULT_HTML = `<!doctype html><html><head><meta charset=utf-8>
<title>Wavegrid Viewer</title>
<style>body{margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh}
canvas{image-rendering:pixelated;width:min(90vw,90vh);height:min(90vw,90vh)}</style></head>
<body><canvas id=c></canvas>
<script>
const ws=new WebSocket('ws://'+location.host);
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let cols=7,rows=7;cv.width=cols;cv.height=rows;
ws.binaryType='arraybuffer';
ws.onmessage=function(e){
  const d=new Uint8Array(e.data);
  const n=d.length/3;
  const sq=Math.ceil(Math.sqrt(n));
  if(sq!==cols){cols=sq;rows=sq;cv.width=cols;cv.height=rows;}
  const img=ctx.createImageData(cols,rows);
  for(let i=0;i<n;i++){img.data[i*4]=d[i*3];img.data[i*4+1]=d[i*3+1];img.data[i*4+2]=d[i*3+2];img.data[i*4+3]=255;}
  ctx.putImageData(img,0,0);
};
</script></body></html>`;

export function createLocalUiSink(config: LocalUiSinkConfig = {}): Sink & { close(): void } {
  const port = config.port ?? 8090;
  const html = config.html ?? DEFAULT_HTML;

  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(html);
  });

  const wss = new WebSocketServer({ server });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  server.listen(port);

  return {
    kind: 'ui',
    present(fb: number[]): void {
      const u8 = Uint8Array.from(fb, v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v)));
      for (const c of clients) {
        if (c.readyState === WebSocket.OPEN) c.send(u8);
      }
    },
    clientCount(): number { return clients.size; },
    close(): void {
      for (const c of clients) { try { c.close(); } catch { /* ignore */ } }
      clients.clear();
      wss.close();
      server.close();
    },
  };
}
