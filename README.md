# VidGrab Desktop

VidGrab Desktop is the desktop-first evolution of the existing VidGrab web product.

## Download

- Latest release: https://github.com/LZY-Ricardo/VidGrab-desktop/releases/tag/v0.1.1
- Windows setup: `VidGrab.Desktop_0.1.1_x64-setup.exe`
- Windows MSI: `VidGrab.Desktop_0.1.1_x64_en-US.msi`

This repository is intentionally split into:

- `desktop/`: Tauri + Vue desktop shell
- `resolver/`: local Python resolver service
- `shared/`: shared contracts and constants
- `docs/`: architecture and rollout notes

## Goal

Move video parsing and downloading to the user's local machine, while keeping account,
membership, email, and AI authorization in the cloud.

## Phase 1

- Windows-first desktop shell
- Local resolver service
- Cloud login / membership integration
- Basic parse and download flow

## Development Entry

### Desktop shell

```bash
cd desktop
npm install
npm run dev
```

### Local resolver

```bash
cd resolver
pip install -r requirements.txt
python server.py
```

### Hosted dev mode

If you want the repo to manage both processes for you:

```bash
cd F:/myProjects/VidGrab
npm run dev:hosted
```

This command will:

1. start `resolver/server.py`
2. wait for `http://127.0.0.1:61337/api/health`
3. start the desktop Vite dev server
4. stop both child processes when you press `Ctrl + C`

## Current Status

This repository is no longer just a skeleton.

What is already in place:

- repository structure
- architecture and migration documentation
- local resolver implementation
- desktop parse/download MVP
- cloud login and membership status
- cloud AI integration
- hosted dev runner for resolver lifecycle

What still needs to be wired:

- true desktop host runtime (Tauri/Electron/native shell)
- packaged resolver runtime strategy
- Windows release flow

## Tauri Host

The repository now includes a first Tauri host skeleton under `desktop/src-tauri/`.

See:

- `docs/TAURI-HOST.md`

Important:

- Tauri frontend and Rust host files are already in place
- this machine still needs Rust/Cargo before `npm run tauri:dev` can actually run
