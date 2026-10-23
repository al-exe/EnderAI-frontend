# Taskforce web app

**Mission control for your AI coding agents.**

[![Watch the 60-second Taskforce demo](https://raw.githubusercontent.com/al-exe/EnderAI/main/docs/media/taskforce-video.jpg)](https://youtu.be/zbJ9Badkvpk)

See every AI agent your team runs in Claude Code, Codex and Cursor, message the ones waiting on you, and keep what they learn for the whole team.

| See every agent | Steer a waiting agent | Keep what they learn |
| --- | --- | --- |
| ![Sessions page](https://raw.githubusercontent.com/al-exe/EnderAI/main/docs/media/taskforce-sessions.png) | ![Message queued for an agent](https://raw.githubusercontent.com/al-exe/EnderAI/main/docs/media/taskforce-steer.png) | ![Team note reused across tools](https://raw.githubusercontent.com/al-exe/EnderAI/main/docs/media/taskforce-library.png) |

## Run it locally

```bash
bun install
bun run dev   # http://localhost:5173
```

Point `VITE_API_URL` in `.env` at the backend and add the `VITE_FIREBASE_*` sign-in settings.

The backend and all docs live in [EnderAI](https://github.com/al-exe/EnderAI).
