# Source provenance and integration

The adapter snapshot comes from The List Access owning source commit `ab69b7e24b995bf6890f28376bbdeb87dc0d5dd8`, deployed as site version 706 on 12 November 2026. File paths and SHA-256 hashes are recorded in [source-provenance.json](source-provenance.json).

Only these application files are mirrored:

- `lib/event-mcp.ts` → `src/event-mcp.ts`
- `app/api/mcp/route.ts` → `src/public-route.ts`
- `app/api/mcp/claude/route.ts` → `src/editorial-route.ts`

The original imports deliberately remain unchanged. `publicEventSearchResponse` belongs to the owning application's public event API: it supplies filtered, public calendar records and applies the editorial selection when requested. `editorialMcpEvent` belongs to the owning application's editorial module: it projects factual fields and compact source-review flags. The routes use the owning application's `@/lib/event-mcp` alias.

The website, calendar records, campaign records, database access, authentication, registry signing key and deployment configuration are not part of this repository. This snapshot cannot be compiled or deployed by itself. It publishes the actual MCP-facing implementation for inspection without claiming to include the entire calendar service.

## Validation

The source generation passed the owning application's full release gate: design checks, Worker/client compilation, 1,364 JavaScript/Worker tests and 26 Python tests. Live checks confirmed initialization, all argument descriptions, read-only annotations, Amsterdam searches, pagination and invalid-limit errors on both anonymous endpoints.

Those checks cover the owning application generation, not an independent build of this snapshot. The registry manifest is validated separately with the official MCP Registry publisher before publication. Source hashes are checked against the owning files before upload.

## Updating the snapshot

Start from the latest owning source. Review and copy only the three listed adapter files. Refresh the provenance record and this validation note using actual results. Validate `server.json`, publish the public repository commit, then publish a new registry version. Runtime changes must pass the owning application's full release gate; metadata-only registry updates do not change the running website.
