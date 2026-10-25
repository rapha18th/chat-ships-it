import type { HiveState, HivePlayer } from '../../../packages/core/src/hive.ts';
import { canvasPoint } from '../../../packages/core/src/controls.ts';

export function setupHive() {
  const view = new URLSearchParams(location.search).get('view');
  const owner = !view;
  const only = view === 'play' || view === 'hive';
  document.body.classList.toggle('hive-only', only);
  const root = document.createElement('section');
  root.className = 'hive-section';
  root.hidden = true;
  root.innerHTML = `<div class="hive-head"><div><div class="eyebrow">ONE WORLD. ONE SHARED GOAL.</div><h2>Your community. <em>Your hive.</em></h2><p id="hive-intro">Join as a bee. Gather nectar together. Chat writes the next rule.</p></div><div class="hive-counter"><strong id="hive-count">0</strong><span>BEES TOGETHER</span></div></div><div class="hive-toolbar"><form id="hive-join"><label for="hive-name">Your guest name</label><input id="hive-name" minlength="2" maxlength="18" pattern="[A-Za-z0-9 _-]+" placeholder="Garden Bee" required/><button class="primary-btn">Join the hive ↗</button></form><span id="hive-connection" role="status">Connecting…</span></div><div class="hive-scoreboard"><span id="hive-title">Community garden</span><strong id="hive-goal">0 / 1200</strong><span id="hive-clock">60s</span><span id="hive-phase">WAITING</span></div><canvas id="hive-game" width="1200" height="675" tabindex="0" aria-label="Shared multiplayer garden. WASD or arrows to fly. Touch and hold to steer."></canvas><div class="hive-controls"><span>WASD or arrows to fly. Touch and hold to steer. Nectar counts for everyone.</span><span id="hive-patch">Original rules</span></div><div id="hive-roster" class="hive-roster" aria-label="Connected bees"></div><div class="hive-owner" ${owner ? '' : 'hidden'}><button class="primary-btn" id="hive-start">Start shared round ↗</button><button class="small-btn" id="hive-pause">Pause round</button><button class="small-btn" id="hive-invite">Copy player invite ↗</button><input id="hive-link" aria-label="Player invite link" readonly/><span id="hive-host-note"></span></div><p class="hive-footnote">Guest names identify game seats. Twitch proposals and votes use the connected channel. Up to 24 bees share the garden.</p><div id="hive-demo-controls" hidden><button class="small-btn" id="hive-demo">Start 3 scripted demo clients</button><button class="small-btn" id="hive-demo-stop">Disconnect demo clients</button><span>CONTROLLED DEMO · SCRIPTED PLAYERS · REAL SHARED SERVER</span></div>`;
  document.querySelector('#app > header')!.after(root);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(id)!;
  const canvas = $<HTMLCanvasElement>('#hive-game'),
    ctx = canvas.getContext('2d')!;
  let state: HiveState | null = null,
    previous: HiveState | null = null,
    received = 0,
    myId = '',
    sequence = 0,
    connected = false,
    socket: WebSocket;
  let pointer: { x: number; y: number } | null = null;
  const keys = new Set<string>(),
    trails = new Map<string, { x: number; y: number; at: number }[]>();
  let name = sessionStorage.getItem('hiveName') || '';
  $<HTMLInputElement>('#hive-name').value = name;
  const invite = new URL('/?view=play', location.href).href;
  $<HTMLInputElement>('#hive-link').value = invite;
  $('#hive-host-note').textContent = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'Local invite. Remote viewers need the hosted app address.'
    : '';
  function connect() {
    socket = new WebSocket(
      `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/hive`,
    );
    socket.onopen = () => {
      connected = true;
      $('#hive-connection').textContent = 'Connected to the shared garden';
      if (name) socket.send(JSON.stringify({ type: 'hive-join', name }));
    };
    socket.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.type === 'hive-welcome') {
          myId = m.id;
          $<HTMLButtonElement>('#hive-join button').textContent = 'You are in the hive ✓';
          $<HTMLButtonElement>('#hive-join button').disabled = true;
          canvas.focus();
        }
        if (m.type === 'hive-error') {
          $('#hive-connection').textContent = m.message;
          $<HTMLButtonElement>('#hive-join button').disabled = false;
        }
        if (m.type === 'hive-state') {
          previous = state;
          state = m.state;
          received = performance.now();
          render();
        }
      } catch {
        /* Invalid snapshots do not change the world. */
      }
    };
    socket.onclose = () => {
      connected = false;
      myId = '';
      $('#hive-connection').textContent = 'Disconnected. Reconnecting…';
      setTimeout(connect, 1500);
    };
    socket.onerror = () => socket.close();
  }
  $('#hive-join').onsubmit = (e) => {
    e.preventDefault();
    name = $<HTMLInputElement>('#hive-name').value.trim();
    sessionStorage.setItem('hiveName', name);
    if (socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ type: 'hive-join', name }));
  };
  async function act(action: string) {
    try {
      const r = await fetch('/api/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionStorage.getItem('adminToken')
            ? { Authorization: `Bearer ${sessionStorage.getItem('adminToken')}` }
            : {}),
        },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      canvas.focus();
    } catch (e) {
      $('#hive-connection').textContent = e instanceof Error ? e.message : 'Action failed';
    }
  }
  $('#hive-start').onclick = () => void act('hive-start');
  $('#hive-pause').onclick = () => void act('hive-pause');
  $('#hive-invite').onclick = async () => {
    try {
      await navigator.clipboard.writeText(invite);
      $('#hive-connection').textContent = 'Player invite copied';
    } catch {
      $<HTMLInputElement>('#hive-link').select();
      $('#hive-connection').textContent = 'Copy the selected player invite';
    }
  };
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  let roster = '';
  function render() {
    if (!state) return;
    root.hidden = !state.enabled && !only;
    document.body.classList.toggle('hive-active', state.enabled);
    $('#hive-count').textContent = String(state.players.length);
    $('#hive-title').textContent = state.title;
    $('#hive-goal').textContent =
      `${state.score.toLocaleString()} / ${state.target.toLocaleString()}`;
    $('#hive-clock').textContent = `${Math.ceil(state.remaining)}s`;
    $('#hive-phase').textContent =
      state.phase === 'won'
        ? 'HIVE GOAL REACHED'
        : state.phase === 'lost'
          ? 'TIME UP'
          : state.phase.toUpperCase();
    $('#hive-patch').textContent = `CURRENT PATCH / ${state.rules.title}`;
    if (!state.enabled)
      $('#hive-intro').textContent =
        'The owner can open the hive by publishing a garden collection game with a bee.';
    const html = state.players
      .map(
        (p) =>
          `<span style="--bee:${p.color}"><i></i><strong>${escape(p.name)}</strong><small>${p.points} nectar points${p.id === myId ? ' · YOU' : ''}</small></span>`,
      )
      .join('');
    if (html !== roster) {
      $('#hive-roster').innerHTML = html || '<span>Invite the first bee.</span>';
      roster = html;
    }
  }
  canvas.onkeydown = (e) => {
    if (
      ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(
        e.key.toLowerCase(),
      )
    ) {
      e.preventDefault();
      keys.add(e.key.toLowerCase());
    }
  };
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => {
    keys.clear();
    pointer = null;
  });
  const aim = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    pointer = canvasPoint(e.clientX, e.clientY, box, 1200, 675);
  };
  canvas.onpointerdown = (e) => {
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    aim(e);
  };
  canvas.onpointermove = (e) => {
    if (e.buttons) aim(e);
  };
  canvas.onpointerup = () => (pointer = null);
  canvas.onpointercancel = () => (pointer = null);
  setInterval(() => {
    if (!myId || !connected || !state) return;
    let dx =
        Number(keys.has('d') || keys.has('arrowright')) -
        Number(keys.has('a') || keys.has('arrowleft')),
      dy =
        Number(keys.has('s') || keys.has('arrowdown')) -
        Number(keys.has('w') || keys.has('arrowup'));
    const me = state.players.find((p) => p.id === myId);
    if (pointer && me) {
      const x = pointer.x - me.x,
        y = pointer.y - me.y,
        n = Math.max(20, Math.hypot(x, y));
      dx = x / n;
      dy = y / n;
    }
    socket.send(JSON.stringify({ type: 'hive-input', dx, dy, sequence: ++sequence }));
  }, 50);
  function text(
    s: string,
    x: number,
    y: number,
    size = 20,
    color = '#f4f3ee',
    align: CanvasTextAlign = 'left',
  ) {
    ctx.fillStyle = color;
    ctx.font = `${size}px Arial`;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  }
  function bee(p: HivePlayer, x: number, y: number, now: number) {
    const points = trails.get(p.id) || [];
    if (Math.hypot(p.vx, p.vy) > 10) points.push({ x, y, at: now });
    while (points.length && (now - points[0].at > 1400 || points.length > 45)) points.shift();
    trails.set(p.id, points);
    points.forEach((a, i) => {
      ctx.globalAlpha = (i / Math.max(1, points.length)) * 0.8;
      ctx.fillStyle =
        state?.rules.trail === 'rainbow' ? `hsl(${(i * 14 + now * 0.08) % 360},90%,70%)` : p.color;
      ctx.beginPath();
      ctx.arc(a.x, a.y, state?.rules.trail === 'sparks' ? 2 : 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x, y);
    const angle = Math.hypot(p.vx, p.vy) > 5 ? Math.atan2(p.vy, p.vx) : 0;
    ctx.rotate(angle);
    ctx.fillStyle = '#d5f4e5aa';
    ctx.beginPath();
    ctx.ellipse(-2, -12, 12, 7, Math.sin(now * 0.035) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-2, 12, 12, 7, -Math.sin(now * 0.035) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 18;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#17221a';
    ctx.fillRect(-7, -10, 4, 20);
    ctx.fillRect(2, -10, 4, 20);
    ctx.beginPath();
    ctx.arc(11, -3, 2, 0, 7);
    ctx.fill();
    if (p.protected) {
      ctx.strokeStyle = p.color + '88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, 7);
      ctx.stroke();
    }
    ctx.restore();
    text(p.name, x, y - 34, 17, p.color, 'center');
    text(p.hull > 0 ? '♥'.repeat(p.hull) : 'RETURNING', x, y + 35, 12, p.color, 'center');
  }
  function frame(now: number) {
    ctx.fillStyle = '#0c2119';
    ctx.fillRect(0, 0, 1200, 675);
    const g = ctx.createRadialGradient(600, 330, 60, 600, 330, 700);
    g.addColorStop(0, '#22493188');
    g.addColorStop(1, '#06140d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1200, 675);
    ctx.strokeStyle = '#b9f87908';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 675);
      ctx.stroke();
    }
    for (let y = 0; y < 675; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }
    for (let i = 0; i < 38; i++) {
      const x = i * 33 + 10,
        y = 650 + Math.sin(i * 4) * 9;
      ctx.fillStyle = '#36543a';
      ctx.fillRect(x, y, 2, 675 - y);
      ctx.fillStyle = ['#ffd26755', '#ff819e44', '#b79aff44'][i % 3];
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 7);
      ctx.fill();
    }
    if (state) {
      for (const n of state.nectar) {
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(Math.PI / 4);
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ffd267';
        ctx.fillStyle = '#ffd267';
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }
      for (const h of state.hazards) {
        ctx.save();
        ctx.translate(h.x, h.y);
        const style = state.rules.asteroidStyle;
        if (style === 'duck') {
          ctx.fillStyle = '#ffd267';
          ctx.beginPath();
          ctx.ellipse(0, 4, h.r, h.r * 0.65, 0, 0, 7);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(h.r * 0.5, -h.r * 0.5, h.r * 0.5, 0, 7);
          ctx.fill();
          ctx.fillStyle = '#ff9b51';
          ctx.fillRect(h.r * 0.8, -h.r * 0.55, h.r * 0.5, h.r * 0.18);
          ctx.fillStyle = '#18251a';
          ctx.beginPath();
          ctx.arc(h.r * 0.65, -h.r * 0.6, 2, 0, 7);
          ctx.fill();
        } else if (style === 'jellyfish') {
          ctx.strokeStyle = '#8beaff';
          ctx.fillStyle = '#8beaff66';
          ctx.beginPath();
          ctx.arc(0, 0, h.r, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 7, 0);
            ctx.quadraticCurveTo(i * 7 + Math.sin(now * 0.003 + i) * 12, 15, i * 7, 30);
            ctx.stroke();
          }
        } else if (style === 'heart') {
          ctx.fillStyle = '#ff819e';
          ctx.scale(h.r / 20, h.r / 20);
          ctx.beginPath();
          ctx.moveTo(0, 18);
          ctx.bezierCurveTo(-40, -4, -12, -32, 0, -12);
          ctx.bezierCurveTo(12, -32, 40, -4, 0, 18);
          ctx.fill();
        } else if (style === 'disco') {
          const gradient = ctx.createRadialGradient(-8, -8, 2, 0, 0, h.r);
          gradient.addColorStop(0, '#f4f3ee');
          gradient.addColorStop(0.4, '#b79aff');
          gradient.addColorStop(1, '#544b88');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, h.r, 0, 7);
          ctx.fill();
          ctx.strokeStyle = '#e5cbff';
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.ellipse(0, 0, h.r * (0.4 + Math.abs(i) * 0.3), h.r, 0, 0, 7);
            ctx.stroke();
          }
        } else {
          ctx.rotate(now * 0.0002 + h.id);
          ctx.fillStyle = style === 'thorn' ? '#879c52' : '#7a8878';
          ctx.beginPath();
          for (let i = 0; i < 14; i++) {
            const a = (i * Math.PI) / 7,
              r = i % 2 ? h.r * (style === 'thorn' ? 0.43 : 0.8) : h.r;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      for (const n of state.pickups) {
        ctx.strokeStyle = '#8beaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 15, 0, 7);
        ctx.stroke();
        text(
          n.kind === 'magnet' ? 'M' : n.kind === 'shield' ? 'S' : 'T',
          n.x,
          n.y + 5,
          16,
          '#8beaff',
          'center',
        );
      }
      const blend = Math.min(1, (now - received) / 100);
      for (const p of state.players) {
        const old = previous?.players.find((a) => a.id === p.id);
        bee(
          p,
          old ? old.x + (p.x - old.x) * blend : p.x,
          old ? old.y + (p.y - old.y) * blend : p.y,
          now,
        );
      }
      for (const id of trails.keys())
        if (!state.players.some((p) => p.id === id)) trails.delete(id);
      ctx.fillStyle = '#08150dcc';
      ctx.fillRect(18, 15, 1164, 43);
      text(`${state.players.length} BEES  /  ONE SHARED GARDEN`, 35, 43, 18, '#b9f879');
      text(
        `${state.score} / ${state.target}  ·  ${Math.ceil(state.remaining)}s`,
        1165,
        43,
        18,
        '#ffd267',
        'right',
      );
      if (state.phase === 'waiting') {
        text('Your hive is gathering.', 600, 280, 42, '#f4f3ee', 'center');
        text('Join a bee. The streamer starts the round.', 600, 324, 23, '#b9cbbf', 'center');
      }
      if (state.phase === 'won' || state.phase === 'lost') {
        ctx.fillStyle = '#07130bc9';
        ctx.fillRect(230, 230, 740, 190);
        text(
          state.phase === 'won' ? 'Your community shipped a win.' : 'A new round is a new chance.',
          600,
          295,
          36,
          '#f4f3ee',
          'center',
        );
        text(
          `${state.score} shared points · ${state.players.length} bees together`,
          600,
          344,
          23,
          '#b9f879',
          'center',
        );
      }
    } else text('Connecting to the shared garden…', 600, 330, 28, '#b9f879', 'center');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  connect();
  const demos: WebSocket[] = [];
  let demoTimer: ReturnType<typeof setInterval> | null = null;
  if (new URLSearchParams(location.search).has('capture')) {
    $('#hive-demo-controls').hidden = false;
    $('#hive-demo').onclick = () => {
      if (demos.length) return;
      for (let i = 0; i < 3; i++) {
        const ws = new WebSocket(
          `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/hive`,
        );
        let id = '',
          seq = 0,
          world: HiveState | null = null;
        ws.onopen = () => ws.send(JSON.stringify({ type: 'hive-join', name: `Demo Bee ${i + 1}` }));
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data);
          if (m.type === 'hive-welcome') id = m.id;
          if (m.type === 'hive-state') world = m.state;
        };
        const timer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN || !world || !id) return;
          const p = world.players.find((a) => a.id === id);
          if (!p) return;
          const targets = world.nectar.filter((n) => n.id % 3 === i);
          const target = (targets.length ? targets : world.nectar).reduce<{
            x: number;
            y: number;
          } | null>(
            (best, n) =>
              !best || Math.hypot(n.x - p.x, n.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)
                ? n
                : best,
            null,
          );
          const x = (target?.x || 600) - p.x,
            y = (target?.y || 337) - p.y,
            n = Math.max(20, Math.hypot(x, y));
          ws.send(JSON.stringify({ type: 'hive-input', dx: x / n, dy: y / n, sequence: ++seq }));
        }, 75);
        ws.onclose = () => clearInterval(timer);
        demos.push(ws);
      }
      $('#hive-demo-controls span').textContent = '3 SCRIPTED DEMO PLAYERS · REAL SHARED SERVER';
    };
    $('#hive-demo-stop').onclick = () => {
      demos.splice(0).forEach((ws) => ws.close());
      if (demoTimer) clearInterval(demoTimer);
    };
  }
  return () => state;
}
