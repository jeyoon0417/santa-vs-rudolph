// SANTA vs RUDOLPH relay server — zero dependencies (Node 18+).
// The room host's browser runs the whole match; this server only does matchmaking and forwards messages.
//   client → server : {t:'hello', v, nick, side}            (first message)
//   server → client : {t:'room', room, you, host, peers:[{id,nick,side}]}
//   non-host → host : any JSON  → delivered to host as {t:'from', f:<id>, d:<msg>}
//   host → others   : {to:<id>|undefined, d:<msg>} → delivered as <msg> (to one peer or to everyone)
//   server → host   : {t:'pj', id, nick, side} peer joined · {t:'pl', id} peer left
//   server → all    : {t:'host', id} when the host left and someone else took over
'use strict';
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const MAX_HUMANS = +(process.env.MAX_HUMANS || 16);
const MAX_MSG = 512 * 1024;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

let nextId = 1, nextRoom = 1;
const rooms = new Map(); // roomId -> {id, v, host, members: Map(id -> conn), created}

// ---------- minimal RFC 6455 framing ----------
function encodeFrame(str, opcode) {
  const payload = Buffer.from(str);
  const len = payload.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeUInt32BE(Math.floor(len / 4294967296), 2); head.writeUInt32BE(len >>> 0, 6); }
  head[0] = 0x80 | (opcode || 1);
  return Buffer.concat([head, payload]);
}

class Conn {
  constructor(socket) {
    this.socket = socket; this.buf = Buffer.alloc(0); this.frag = []; this.fragOp = 0;
    this.id = nextId++; this.room = null; this.nick = ''; this.side = 'santa'; this.alive = true; this.closed = false; this.lastSeen = Date.now();
    socket.setNoDelay(true);
    socket.on('data', (d) => this.onData(d));
    socket.on('close', () => this.onClose());
    socket.on('error', () => this.onClose());
  }
  send(obj) {
    if (this.closed) return;
    try { this.socket.write(encodeFrame(typeof obj === 'string' ? obj : JSON.stringify(obj), 1)); } catch (e) { this.onClose(); }
  }
  sendRaw(str) { this.send(str); }
  ping() { if (!this.closed) try { this.socket.write(encodeFrame('', 9)); } catch (e) { } }
  close() { if (this.closed) return; try { this.socket.write(encodeFrame('', 8)); this.socket.end(); } catch (e) { } this.onClose(); }
  onData(d) {
    this.lastSeen = Date.now();
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1], fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = this.buf.readUInt32BE(2) * 4294967296 + this.buf.readUInt32BE(6); off = 10; }
      if (len > MAX_MSG) { this.close(); return; }
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) {
        const mask = this.buf.subarray(off, off + 4), out = Buffer.alloc(len);
        for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
        payload = out;
      }
      this.buf = this.buf.subarray(need);
      if (op === 8) { this.close(); return; }
      if (op === 9) { try { this.socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); } catch (e) { } continue; }
      if (op === 10) { this.alive = true; continue; }
      if (op === 0) { this.frag.push(payload); if (!fin) continue; payload = Buffer.concat(this.frag); this.frag = []; }
      else if (!fin) { this.frag = [payload]; this.fragOp = op; continue; }
      this.alive = true;
      let msg; try { msg = JSON.parse(payload.toString('utf8')); } catch (e) { continue; }
      onMessage(this, msg);
    }
  }
  onClose() {
    if (this.closed) return;
    this.closed = true;
    try { this.socket.destroy(); } catch (e) { }
    leaveRoom(this);
  }
}

// ---------- rooms ----------
function roomPeers(room, exceptId) {
  const out = [];
  room.members.forEach((c) => { if (c.id !== exceptId) out.push({ id: c.id, nick: c.nick, side: c.side }); });
  return out;
}
function findRoom(v) {
  let best = null;
  rooms.forEach((r) => {
    if (r.v !== v || r.members.size >= MAX_HUMANS) return;
    if (!best || r.members.size > best.members.size) best = r; // fill busy rooms first
  });
  return best;
}
function joinRoom(c, msg) {
  if (c.room) return;
  c.nick = String(msg.nick || 'Elf').replace(/[<>&"'`\\]/g, '').slice(0, 14) || 'Elf';
  c.side = msg.side === 'rudolph' ? 'rudolph' : 'santa';
  const v = String(msg.v || '0');
  let room = findRoom(v);
  if (!room) { room = { id: 'r' + (nextRoom++), v: v, host: c.id, members: new Map(), created: Date.now() }; rooms.set(room.id, room); }
  room.members.set(c.id, c); c.room = room;
  c.send({ t: 'room', room: room.id, you: c.id, host: room.host, peers: roomPeers(room, c.id) });
  if (room.host !== c.id) { const h = room.members.get(room.host); if (h) h.send({ t: 'pj', id: c.id, nick: c.nick, side: c.side }); }
}
function leaveRoom(c) {
  const room = c.room; if (!room) return;
  room.members.delete(c.id); c.room = null;
  if (!room.members.size) { rooms.delete(room.id); return; }
  if (room.host === c.id) {
    let first = null; room.members.forEach((m) => { if (!first || m.id < first.id) first = m; });
    room.host = first.id;
    room.members.forEach((m) => m.send({ t: 'host', id: room.host, left: c.id }));
  } else {
    const h = room.members.get(room.host); if (h) h.send({ t: 'pl', id: c.id });
  }
}
function onMessage(c, msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.t === 'hello') { joinRoom(c, msg); return; }
  if (msg.t === 'bye') { c.close(); return; }
  const room = c.room; if (!room) return;
  if (room.host === c.id) {
    if (msg.d === undefined) return;
    const str = JSON.stringify(msg.d);
    if (msg.to) { const t = room.members.get(msg.to); if (t) t.sendRaw(str); }
    else room.members.forEach((m) => { if (m.id !== c.id) m.sendRaw(str); });
  } else {
    const h = room.members.get(room.host);
    if (h) h.sendRaw('{"t":"from","f":' + c.id + ',"d":' + JSON.stringify(msg) + '}');
  }
}

// ---------- http + upgrade ----------
const server = http.createServer((req, res) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
  if (req.url === '/stats') {
    let players = 0; rooms.forEach((r) => { players += r.members.size; });
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
    res.end(JSON.stringify({ rooms: rooms.size, players: players }));
    return;
  }
  res.writeHead(200, Object.assign({ 'Content-Type': 'text/plain' }, headers));
  res.end('ok');
});
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  new Conn(socket);
});
// heartbeat: drop silent sockets
const all = () => { const out = []; rooms.forEach((r) => r.members.forEach((m) => out.push(m))); return out; };
setInterval(() => {
  const now = Date.now();
  all().forEach((c) => { if (now - c.lastSeen > 45000) c.close(); else c.ping(); });
}, 15000);
server.listen(PORT, () => console.log('relay listening on ' + PORT));
