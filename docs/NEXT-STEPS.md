# Next Steps

## Current Status

Phase 1, Phase 2, Phase 3, Phase 4 and the Phase 5 host foundations are now in place:

1. the mature local resolver implementation has been migrated into `resolver/`
2. the core endpoints are covered by minimal regression tests
3. the desktop shell now supports the local parse/download MVP flow
4. the desktop shell now supports cloud login, token persistence, current user and membership status
5. the desktop shell now supports AI analysis, transcript download, mind map display and Q&A
6. the repo can now start and stop resolver plus desktop together via a hosted dev runner
7. the repo now includes a first Tauri host skeleton and frontend host bridge
8. Rust/Cargo are now installed locally and the first real `tauri:dev` blocker has been identified
9. `npm run tauri:dev` now reaches a successful native app launch on Windows after fixing port, resource path and icon issues
10. the Tauri host now exposes resolver workdir/config/log paths and writes host + resolver output to a local log file
11. the Tauri host now performs a local resolver health probe and returns `service_ready` to the desktop UI

## Next

1. validate that `ResolverHostPanel` can query status, start resolver and stop resolver inside the Tauri shell
2. decide how resolver should consume the injected local config directory
3. decide how Python runtime will be shipped in packaged builds

## Later

1. add Windows packaging and release documentation
2. refine desktop account area and session recovery UX
3. polish AI interaction and layout details after host integration is stable
