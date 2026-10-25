# Submission pack

Official event: https://twitchcon-codex.devpost.com/

Rules read directly in the browser on October 25: https://twitchcon-codex.devpost.com/rules

Deadline: **November 2, 2026, 2:00 pm Pacific / November 3, 00:00 SAST**. Target November 2 at 23:00 SAST to leave a buffer.

Main build chat: **Build Chat Ships It**

Main Codex session ID: **01a1726e-fe77-78e0-a787-399855bb9955** (verified against the desktop app’s thread inventory). Use this build chat, not a runtime mod thread or the review session.

## Ready locally

- Project source, lockfile, run instructions, credential guide, CI and Docker files.
- Draft description and 2:50–3:00 video beats in `PITCH.md`; record under three minutes.
- Real Codex SDK generation smoke: 14,385 ms.
- Real studio vote → approval → Codex → validation → ship: **14,453 ms**. Reviewed proposal, example author, real generated mechanic. No Twitch connection was used in that test.
- Ten automated tests pass, including a local WebSocket mock for EventSub welcome/subscription and account replacement. This is not the official Twitch CLI mock server and does not prove real Twitch account integration.
- HTTP/WebSocket rehearsal smoke passes, including origin rejection, voting, ship, rollback and stop.
- Desktop 1920×1080 and mobile 390×844 layouts visually checked. Real-build screenshot: `artifacts/studio-live.jpg` (local, ignored by Git).
- Codex review found three P2 defects (OAuth port, old channel socket, stale votes); fixed with regression coverage. Initial workspace review could not initialize Windows tools; retry reviewed the supplied patch directly.

## Remaining for a valid entry

- Entrant confirms age, residence and other eligibility requirements and joins the event.
- Add Twitch app credentials and Gemini key, then verify a real viewer’s proposal through screening and Codex on the actual channel.
- Record functioning Twitch footage and Codex build footage, with permission for any externally supplied material; upload the final video publicly to YouTube.
- Publish source to GitHub/GitLab/Bitbucket and provide judging access. Private GitHub/GitLab repositories must be shared with the judging address in the rules.
- Fill the Devpost entry with the repository URL, description, video URL and main build-session ID. Entrant reviews and submits the entry before the deadline.

No event registration, public repository, video upload, stream or Devpost submission was performed in this local build.
