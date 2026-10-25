import type { State } from '../../../packages/core/src/protocol.ts';
import type { HiveState } from '../../../packages/core/src/hive.ts';

// Local production utility. Captures the real engine canvas and current server state.
export function setupCapture(
  restart: () => void,
  readState: () => State | null,
  readHive: () => HiveState | null,
) {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;z-index:99999;bottom:12px;left:12px;padding:12px;background:#111;color:white;border:1px solid #b9f879;font:14px Arial;display:flex;gap:10px;align-items:center';
  panel.innerHTML =
    '<label>Film shot <select id="film-shot"><option value="world">World</option><option value="patch">Patch</option><option value="build">Build</option><option value="control">Control</option></select></label><label>Seconds <input id="film-seconds" type="number" min="5" max="90" value="25" style="width:50px"></label><button id="film-record">Record real gameplay</button><span id="film-status">Ready</span><a id="film-download" hidden>Download recording</a>';
  document.body.append(panel);
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Finish recording';
  stopButton.id = 'film-stop';
  stopButton.disabled = true;
  panel.append(stopButton);
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const c = canvas.getContext('2d')!;
  const source = document.querySelector<HTMLCanvasElement>('#game')!;
  let state: State | null = null;
  let hive: HiveState | null = null;
  const text = (s: string, x: number, y: number, size = 24, color = '#f4f3ee', weight = 400) => {
    c.font = `${weight} ${size}px Arial`;
    c.fillStyle = color;
    c.fillText(s, x, y);
  };
  const wrap = (s: string, x: number, y: number, width: number, size = 25, color = '#9da6a3') => {
    let line = '';
    for (const word of s.split(' ')) {
      const trial = line + word + ' ';
      c.font = `${size}px Arial`;
      if (c.measureText(trial).width > width && line) {
        text(line, x, y, size, color);
        y += size * 1.4;
        line = '';
      }
      line += word + ' ';
    }
    text(line, x, y, size, color);
    return y;
  };
  let shot = 'world';
  function frame(t: number) {
    state = readState();
    hive = readHive();
    c.fillStyle = '#080b0a';
    c.fillRect(0, 0, 1920, 1080);
    text('↗  chat ships it.', 90, 92, 34, '#f4f3ee', 700);
    text('CODEX × TWITCH', 1550, 88, 19, '#a7b2ab', 600);
    c.fillStyle = '#b9f879';
    c.fillRect(90, 135, 1740, 2);
    const shared = !!hive?.enabled;
    const title =
      shot === 'world'
        ? shared
          ? 'Play together.'
          : 'Create a world.'
        : shot === 'patch'
          ? 'Ship it to everyone.'
          : shot === 'build'
            ? 'Codex at work.'
            : 'Stay in control.';
    text(title, 90, 270, shot === 'patch' ? 50 : 68, '#f4f3ee', 600);
    const sub =
      shot === 'world'
        ? shared
          ? 'One garden. A shared nectar goal. Every bee counts.'
          : 'A tiny bee. A glowing garden. A challenge of your own.'
        : shot === 'patch'
          ? 'The same patch. The same world. Every connected bee.'
          : shot === 'build'
            ? 'A real source artifact. Visible checks. A measured build.'
            : 'One click restores the rule for the whole hive.';
    wrap(sub, 94, 335, 460, 30);
    text(state?.game?.title || 'Honeyglow Hustle', 94, 570, 30, '#b9f879', 600);
    wrap(
      shared
        ? `${hive!.players.length} connected bees. ${hive!.score} of ${hive!.target} shared points. ${Math.ceil(hive!.remaining)} seconds left.`
        : state?.game?.objective || '',
      94,
      620,
      450,
      24,
    );
    text(`TWITCH  /  ${state?.twitch.channel || 'rapha18th'}`, 94, 790, 20, '#c0c9c2');
    text(
      state?.twitch.connected ? 'CONNECTED' : 'CONNECTION PENDING',
      94,
      830,
      18,
      state?.twitch.connected ? '#b9f879' : '#c0c9c2',
    );
    c.save();
    c.beginPath();
    c.roundRect(640, 205, 1190, 670, 20);
    c.clip();
    c.drawImage(
      shared ? document.querySelector<HTMLCanvasElement>('#hive-game')! : source,
      640,
      205,
      1190,
      670,
    );
    c.restore();
    c.strokeStyle = '#26332b';
    c.lineWidth = 2;
    c.strokeRect(640, 205, 1190, 670);
    text(
      shared ? 'ACTUAL SHARED SERVER CAPTURE' : 'ACTUAL ENGINE CAPTURE',
      665,
      920,
      18,
      '#9da6a3',
    );
    text(shared ? 'SCRIPTED DEMO PLAYERS' : 'AUTOPILOT DEMONSTRATION', 1485, 920, 17, '#9da6a3');
    if (shot === 'build') {
      c.fillStyle = 'rgba(7,12,10,.94)';
      c.fillRect(665, 440, 1140, 410);
      text(`BUILD ROOM  /  ${state?.phase.toUpperCase() || 'READY'}`, 695, 485, 24, '#b9f879', 600);
      (state?.feed || [])
        .slice(-6)
        .forEach((f, i) =>
          text(
            f.text.slice(0, 82),
            695,
            535 + i * 43,
            19,
            f.kind === 'pass' ? '#b9f879' : '#d7ddd7',
          ),
        );
    }
    if (shot === 'patch' || shot === 'control') {
      const details = state?.gates?.filter((g) => g.ok).length;
      text(state?.active.title || '', 665, 970, 28, '#f4f3ee', 600);
      text(
        state?.buildMs
          ? `${(state.buildMs / 1000).toFixed(1)}s BUILD  /  ${details} CHECKS PASSED`
          : 'OWNER CREATED GAME',
        665,
        1008,
        18,
        '#b9f879',
      );
    }
    text('CONTROLLED DEMO  /  OWNER ACCOUNT', 94, 1000, 17, '#7b8980');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  panel.querySelector<HTMLButtonElement>('#film-record')!.onclick = () => {
    restart();
    shot = panel.querySelector<HTMLSelectElement>('#film-shot')!.value;
    const seconds = Number(panel.querySelector<HTMLInputElement>('#film-seconds')!.value);
    const status = panel.querySelector<HTMLElement>('#film-status')!;
    const button = panel.querySelector<HTMLButtonElement>('#film-record')!;
    const link = panel.querySelector<HTMLAnchorElement>('#film-download')!;
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 7000000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      stopButton.disabled = true;
      if (!blob.size) {
        status.textContent = 'No video frames recorded. Keep the studio visible and retry.';
        button.disabled = false;
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      link.href = URL.createObjectURL(blob);
      link.download = `chat-ships-it-${shot}.webm`;
      link.hidden = false;
      status.textContent = 'Recording ready';
      button.disabled = false;
      stream.getTracks().forEach((t) => t.stop());
    };
    button.disabled = true;
    stopButton.disabled = false;
    link.hidden = true;
    recorder.start(1000);
    let elapsed = 0;
    status.textContent = `Recording ${seconds}s`;
    const timer = setInterval(() => {
      elapsed++;
      status.textContent = `Recording ${elapsed}/${seconds}s`;
      if (elapsed >= seconds) {
        clearInterval(timer);
        recorder.stop();
      }
    }, 1000);
    stopButton.onclick = () => {
      clearInterval(timer);
      if (recorder.state === 'recording') recorder.stop();
    };
  };
}
