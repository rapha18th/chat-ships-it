import './style.css';
import { Game } from './game.ts';
import type { State } from '../../../packages/core/src/protocol.ts';
const $ = <T extends HTMLElement = HTMLElement>(q: string) => document.querySelector<T>(q)!;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const overlay = new URLSearchParams(location.search).get('view') === 'overlay';
const gameOnly = new URLSearchParams(location.search).get('view') === 'game';
document.body.classList.toggle('overlay-view', overlay);
document.body.classList.toggle('game-view', gameOnly);
$('#app').innerHTML = `
<header class="topbar"><a class="brand" href="/"><span class="brand-mark">↗</span>chat ships it<span class="brand-dot">.</span></a><div class="top-meta"><span class="pill"><i></i> COMMUNITY BUILT. LIVE SHIPPED.</span><button class="icon-btn" id="settings" aria-label="Open connection settings">⚙ <span>Settings</span></button></div></header>
<main><div class="intro"><div><div class="eyebrow">THE AUDIENCE HAS COMMIT ACCESS</div><h1>Chat writes the <em>patch notes.</em></h1><p>You play. Chat pitches. Codex makes it real. The game never stops.</p></div><div class="session-tag"><span class="status-led"></span><div><strong id="mode-label">REHEARSAL STUDIO</strong><span id="connection">Connecting to control server…</span></div></div></div>
<div class="studio"><section class="game-panel"><div class="panel-heading"><div><span class="tiny-square"></span><strong>ORBITAL</strong><span class="muted slash">/</span><span class="muted">a game with no final version</span></div><span class="live-tag" id="game-status">RUNNING</span></div>
<div class="viewport"><canvas id="game" tabindex="0" aria-label="Orbital game. Click to focus. W or up to thrust, A and D to turn, space to shoot, R to restart. Touch and hold to steer and shoot."></canvas><div class="game-hud"><div><span class="hud-label">SCORE</span><strong id="score">000000</strong></div><div class="hud-right"><span class="hud-label">HULL</span><strong id="hull">◆ ◆ ◆</strong></div></div><div class="sector-label">SECTOR 07 <span>✧</span> THE ASTEROID BELT</div><div class="mod-badge"><span class="status-led"></span><span id="active-rule">Original rules</span></div><div id="ship-toast" class="ship-toast" hidden></div></div>
<div class="game-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>D</kbd> move <span class="control-gap"><kbd>SPACE</kbd> shoot</span><span class="control-gap touch-tip">touch & hold to fly</span></span><div><button id="sound" class="text-btn">Sound off</button><button id="fullscreen" class="text-btn">↗ Fullscreen</button></div></div>
<div class="rule-strip"><span class="rule-icon">⌘</span><div><span class="eyebrow">CURRENT PATCH</span><strong id="patch-title">Orbital / original rules</strong></div><span class="patch-author" id="patch-author">ENGINE v0.1</span><button data-action="rollback" class="small-btn" id="rollback">↶ Roll back</button></div>
<div class="pipeline" id="pipeline"></div>
<section class="agent-panel"><div class="panel-heading"><div><span class="terminal-mark">›_</span><strong>THE BUILD ROOM</strong><span class="muted">Codex at the keyboard</span></div><span class="mono muted" id="build-time">AWAITING A WINNER</span></div><div class="agent-columns"><div class="terminal" id="feed" role="log" aria-label="Build activity"></div><div class="code-panel"><div class="file-tab"><span class="ts-icon">TS</span> candidate.ts<span class="file-status" id="file-status">RULE FILE</span></div><pre id="source"></pre></div></div><div class="gates" id="gates"></div></section>
</section><aside class="audience"><div class="audience-head"><div><div class="eyebrow">THE NEXT PLOT TWIST</div><h2>Chat’s in control<span>.</span></h2></div><span class="round-tag" id="round-tag">ROUND 01</span></div><div class="vote-status"><span id="vote-status">Waiting for your next bad idea.</span><span class="countdown" id="countdown">—</span></div><div class="proposal-list" id="proposals"></div>
<div class="proposal-hint"><span>↳</span> In Twitch chat: <code>!mod your wild idea</code><br/><span class="hint-indent">Vote with <code>1</code>, <code>2</code>, or <code>3</code>. One vote per viewer.</span></div>
<div class="confidence"><div class="confidence-head"><span>WILL IT SHIP?</span><span class="confidence-badge">CONFIDENCE VOTE</span></div><p>No points. Just a little faith in the compiler.</p><div class="bet-buttons"><button data-bet="ship">↗ It ships <span id="bet-ship">0</span></button><button data-bet="fail">↘ It breaks <span id="bet-fail">0</span></button></div><div id="bet-result" class="bet-result">Opens when the winning idea is locked.</div></div>
<div class="streamer-controls"><div class="controls-title"><span class="eyebrow">STREAMER DESK</span><span class="mono muted" id="approval-label">YOU HAVE THE FINAL SAY</span></div><div id="actions"></div><div class="control-bottom"><button data-action="reset" class="text-btn">+ New round</button><button data-action="stop" class="danger-btn">■ Kill switch</button></div></div>
<div class="trust-note"><span>⛨</span><div><strong>Wild ideas. Bounded code.</strong><p>Typed rules. Literal-only parser. Validated before it touches your game.</p></div></div></aside></div>
<footer><span>BUILT WITH CODEX <span class="footer-x">×</span> PLAYED BY EVERYONE</span><span id="footer-mode">REHEARSAL · NO LIVE CHAT CONNECTED</span><a href="https://github.com/openai/codex/tree/main/sdk/typescript" target="_blank" rel="noreferrer">Under the hood ↗</a></footer></main>
<div class="toast" id="toast" role="status" hidden></div>
<dialog id="settings-dialog"><form method="dialog"><div class="dialog-head"><div><div class="eyebrow">CONTROL ROOM</div><h2>Make it live.</h2></div><button class="icon-btn" aria-label="Close settings">✕</button></div></form><div class="settings-body"><p>Rehearsal works now. Connect your channel and enable the authenticated Codex worker when you’re ready.</p><div id="integration-status"></div><label>Admin token <input id="admin-token" type="password" autocomplete="off" placeholder="Only needed on a public server"/></label><button id="save-token" class="primary-btn">Save for this tab</button><button id="connect-twitch" class="secondary-btn">Connect Twitch ↗</button><button id="switch-mode" class="secondary-btn">Switch to live mode</button><button id="live-starters" class="secondary-btn">Try real Codex with reviewed starter ideas</button><details><summary>OBS browser sources & setup</summary><p>Game: <code>?view=game</code><br/>Overlay: <code>?view=overlay</code><br/>Use 1920 × 1080. Overlay has a transparent background. Keep the streamer desk out of the broadcast.</p><p>Credentials stay in the server’s <code>.env</code>. See <code>docs/SETUP.md</code> for exact steps. Never paste secrets into chat.</p></details><form id="propose-form"><label>Screen a live proposal<input name="author" maxlength="25" placeholder="viewer_name" required pattern="[A-Za-z0-9_]+"/><input name="idea" minlength="8" maxlength="240" placeholder="Make gravity flip every six seconds" required/></label><button class="secondary-btn">Submit through live screening</button></form></div></dialog>`;
if (overlay) $('.audience').append($('.agent-panel'));
const game = new Game($('#game'), (score, hull) => {
  $('#score').textContent = score.toString().padStart(6, '0');
  $('#hull').textContent = '◆ '.repeat(Math.max(0, hull)) + '◇ '.repeat(Math.max(0, 3 - hull));
  $('#game-status').textContent = game.autopilot ? 'AUTOPILOT · CLICK TO PLAY' : 'MANUAL PILOT';
});
let state: State | null = null;
let connected = false;
let health: {
  codexEnabled: boolean;
  geminiConfigured: boolean;
  twitchConfigured: boolean;
  adminRequired: boolean;
} | null = null;
let lastPatch = '',
  toastTimer: ReturnType<typeof setTimeout>;
function toast(text: string) {
  $('#toast').textContent = text;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('#toast').hidden = true), 5500);
}
async function api(path: string, body: unknown) {
  const response = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}`,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
async function action(action: string, extra: Record<string, string> = {}) {
  try {
    await api('action', { action, ...extra });
  } catch (e) {
    toast((e as Error).message);
  }
}
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement,
    button = target.closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.action) void action(button.dataset.action);
  if (button.dataset.vote) void action('cast', { id: button.dataset.vote });
  if (button.dataset.bet) void action('bet', { choice: button.dataset.bet });
});
$('#sound').onclick = () => {
  game.muted = !game.muted;
  $('#sound').textContent = game.muted ? 'Sound off' : 'Sound on';
};
$('#fullscreen').onclick = () => {
  const view = $('.viewport');
  if (document.fullscreenElement) void document.exitFullscreen();
  else
    void view.requestFullscreen().catch(() => toast('Fullscreen is unavailable in this browser.'));
};
$('#settings').onclick = async () => {
  try {
    health = await (await fetch('/api/health')).json();
    renderSettings();
    $<HTMLDialogElement>('#settings-dialog').showModal();
  } catch {
    toast('Control server unavailable.');
  }
};
$('#save-token').onclick = () => {
  sessionStorage.setItem('adminToken', $<HTMLInputElement>('#admin-token').value);
  $<HTMLInputElement>('#admin-token').value = '';
  toast('Admin token saved in this tab’s session.');
};
$('#connect-twitch').onclick = async () => {
  try {
    const result = await api('twitch/connect', {});
    location.assign(result.url);
  } catch (e) {
    toast((e as Error).message);
  }
};
$('#live-starters').onclick = () => void action('seed-live').then(renderSettings);
$('#switch-mode').onclick = () =>
  void action('mode', { mode: state?.mode === 'live' ? 'rehearsal' : 'live' }).then(renderSettings);
$('#propose-form').onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  try {
    const data = new FormData(form);
    await api('proposal', { idea: data.get('idea'), author: data.get('author') });
    toast('Screened and admitted to the next vote.');
    form.reset();
  } catch (e) {
    toast((e as Error).message);
  }
};
function renderSettings() {
  if (!health) return;
  $('#integration-status').innerHTML = [
    [
      'Codex worker',
      health.codexEnabled
        ? 'Enabled · authentication checked on build'
        : 'Disabled · set ENABLE_CODEX=true',
    ],
    ['Gemini screening', health.geminiConfigured ? 'Configured' : 'Add GEMINI_API_KEY to .env'],
    [
      'Twitch',
      state?.twitch.connected
        ? `Connected · @${esc(state.twitch.channel || '')}`
        : health.twitchConfigured
          ? 'App configured · authorize below'
          : 'Add client ID and secret to .env',
    ],
  ]
    .map(
      ([name, value]) =>
        `<div class="integration-row"><strong>${name}</strong><span>${value}</span></div>`,
    )
    .join('');
  $('#switch-mode').textContent =
    state?.mode === 'live' ? 'Switch to rehearsal' : 'Switch to live mode';
}
function render(s: State) {
  state = s;
  game.setMod(s.active);
  const winner = s.winner;
  $('#mode-label').textContent = s.mode === 'rehearsal' ? 'REHEARSAL STUDIO' : 'LIVE CONTROL ROOM';
  $('#connection').textContent = connected
    ? s.twitch.connected
      ? `Twitch connected · @${s.twitch.channel}`
      : 'Local session · Twitch disconnected'
    : 'Reconnecting to control server…';
  $('#round-tag').textContent = `ROUND ${String(s.round).padStart(2, '0')}`;
  $('#patch-title').textContent = s.active.title;
  $('#active-rule').textContent = s.active.id === 'orbital' ? 'Original rules' : s.active.title;
  $('#patch-author').textContent = s.credit ? `SHIPPED BY @${s.credit}` : 'ENGINE v0.1';
  $('#rollback').toggleAttribute(
    'disabled',
    !s.history.length || ['building', 'validating', 'voting', 'ready'].includes(s.phase),
  );
  $('#pipeline').innerHTML = ['Propose', 'Vote', 'Build', 'Validate', 'Ship']
    .map((label, i) => {
      const idx = {
        collecting: 0,
        voting: 1,
        ready: 1,
        building: 2,
        validating: 3,
        shipped: 4,
        failed: 3,
        stopped: 0,
      }[s.phase];
      return `<div class="pipeline-step ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}"><span>${i < idx ? '✓' : String(i + 1).padStart(2, '0')}</span>${label}${i < 4 ? '<b>→</b>' : ''}</div>`;
    })
    .join('');
  $('#vote-status').textContent = {
    collecting: 'Three ideas. One plot twist.',
    voting: 'Pick the next rule. Make it weird.',
    ready: 'The people have spoken.',
    building:
      s.mode === 'rehearsal' ? 'Loading a reviewed example.' : 'Codex is writing the next rule.',
    validating: 'Proving it belongs in the game.',
    shipped: 'Chat shipped it. The rules just changed.',
    failed: 'This one broke. The game kept going.',
    stopped: 'Mods stopped. Original rules restored.',
  }[s.phase];
  const total = Math.max(
    1,
    s.proposals.reduce((a, p) => a + p.votes, 0),
  );
  $('#proposals').innerHTML = s.proposals.length
    ? s.proposals
        .map(
          (p, i) =>
            `<button class="proposal ${winner?.id === p.id ? 'winner' : ''}" data-vote="${esc(p.id)}" ${s.phase !== 'voting' ? 'disabled' : ''}><div class="proposal-top"><span class="proposal-number">0${i + 1}</span><span class="viewer">@${esc(p.author)}</span>${winner?.id === p.id ? '<span class="winner-tag">WINNER ↗</span>' : `<span class="vote-total">${p.votes} ${p.votes === 1 ? 'vote' : 'votes'}</span>`}</div><h3>${esc(p.sample === 0 ? 'What if asteroids were… ducks?' : p.sample === 1 ? 'Gravity should have trust issues.' : p.sample === 2 ? 'Give us a little bullet time.' : p.spec)}</h3><div class="vote-meter"><span style="width:${Math.max(2, (p.votes / total) * 100)}%"></span></div><div class="proposal-bottom"><span>${p.sample !== undefined ? 'REVIEWED EXAMPLE' : 'SCREENED SPEC'}</span><span>${Math.round((p.votes / total) * 100)}%</span></div></button>`,
        )
        .join('')
    : `<div class="empty-proposals"><div class="empty-orbit">✳</div><h3>The next rule starts here.</h3><p>Load the rehearsal to try three ideas, or connect Twitch to collect live proposals.</p></div>`;
  $('#feed').innerHTML = s.feed.length
    ? s.feed
        .slice(-12)
        .map(
          (f) =>
            `<div class="feed-line ${f.kind}"><time>${new Date(f.at).toLocaleTimeString('en-GB', { hour12: false })}</time><span>${f.kind === 'pass' ? '✓' : f.kind === 'fail' ? '×' : '›'}</span><p>${esc(f.text)}</p></div>`,
        )
        .join('')
    : '<div class="terminal-idle"><span class="terminal-cursor">▌</span><p>A little chaos is waiting to compile.</p><small>Build activity appears here. Rehearsal never impersonates Codex.</small></div>';
  $('#feed').scrollTop = $('#feed').scrollHeight;
  $('#source').textContent = s.source;
  $('#file-status').textContent = s.mode === 'rehearsal' ? 'EXAMPLE FILE' : 'GENERATED FILE';
  $('#build-time').textContent =
    s.buildMs !== null
      ? `${(s.buildMs / 1000).toFixed(1)}s / ${s.mode === 'rehearsal' ? 'EXAMPLE LOAD' : 'BUILD + GATE'}`
      : s.phase === 'building'
        ? 'WORKING…'
        : 'AWAITING A WINNER';
  $('#gates').innerHTML = s.gates.length
    ? s.gates
        .map(
          (g) =>
            `<span class="gate ${g.ok ? 'pass' : 'fail'}" title="${esc(g.detail)}">${g.ok ? '✓' : '×'} ${esc(g.name)}</span>`,
        )
        .join('')
    : '<span class="muted">⛨ Every patch passes syntax, capability, bounds, and simulation checks.</span>';
  $('#bet-ship').textContent = String(s.bets.ship);
  $('#bet-fail').textContent = String(s.bets.fail);
  document
    .querySelectorAll<HTMLButtonElement>('[data-bet]')
    .forEach((b) => (b.disabled = s.phase !== 'ready'));
  $('#bet-result').textContent =
    s.phase === 'shipped'
      ? '↗ RESOLVED: IT SHIPPED.'
      : s.phase === 'failed'
        ? '↘ RESOLVED: IT BROKE.'
        : s.phase === 'ready'
          ? 'Open now · !bet ship or !bet fail'
          : s.phase === 'building' || s.phase === 'validating'
            ? 'Locked. Let the compiler cook.'
            : 'Opens when the winning idea is locked.';
  const a = $('#actions');
  if (s.phase === 'voting')
    a.innerHTML =
      '<button class="primary-btn" data-action="lock">Lock the vote early <span>→</span></button>';
  else if (s.phase === 'ready')
    a.innerHTML = `<button class="primary-btn" data-action="build">${s.mode === 'rehearsal' ? 'Load winning example' : 'Approve & let Codex build'} <span>↗</span></button>`;
  else if (s.phase === 'building' || s.phase === 'validating')
    a.innerHTML = '<button class="primary-btn" disabled>Working on the next plot twist…</button>';
  else if (s.proposals.length >= 2 && s.phase === 'collecting')
    a.innerHTML =
      '<button class="primary-btn" data-action="vote">Open the vote <span>30s →</span></button>';
  else if (s.phase === 'shipped' || s.phase === 'failed')
    a.innerHTML =
      '<button class="primary-btn" data-action="reset">Next round. New rules. <span>→</span></button>';
  else
    a.innerHTML = `<button class="primary-btn" data-action="seed">${s.phase === 'stopped' ? 'Restart rehearsal' : 'Load the rehearsal'} <span>↗</span></button>`;
  $('#footer-mode').textContent =
    s.mode === 'rehearsal'
      ? 'REHEARSAL · REVIEWED EXAMPLES · NO AI GENERATION'
      : s.twitch.connected
        ? 'LIVE TWITCH · REAL CODEX BUILDS'
        : 'LIVE MODE · TWITCH DISCONNECTED';
  if (lastPatch && lastPatch !== s.active.id && s.phase === 'shipped') {
    $('#ship-toast').innerHTML =
      `<span>PATCH SHIPPED ↗</span><strong>${esc(s.active.title)}</strong><small>Proposed by @${esc(s.credit || 'chat')} · ${s.mode === 'rehearsal' ? 'reviewed example' : 'coded by Codex'}</small>`;
    $('#ship-toast').hidden = false;
    setTimeout(() => ($('#ship-toast').hidden = true), 6000);
  }
  lastPatch = s.active.id;
}
setInterval(() => {
  if (state?.deadline) {
    $('#countdown').textContent =
      `${Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000))}s`;
  } else
    $('#countdown').textContent =
      state?.phase === 'shipped' ? 'SHIPPED ↗' : state?.phase === 'building' ? 'BUILDING' : '—';
}, 250);
function connect() {
  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`,
  );
  ws.onopen = () => {
    connected = true;
  };
  ws.onmessage = (e) => {
    try {
      const message = JSON.parse(e.data);
      if (message.type === 'state') render(message.state);
    } catch {
      toast('Invalid server update. Reconnect to retry.');
    }
  };
  ws.onclose = () => {
    connected = false;
    $('#connection').textContent = 'Disconnected. Retrying…';
    setTimeout(connect, 2000);
  };
  ws.onerror = () => ws.close();
}
connect();
