# Protocol and tool reference

## Transport

Send JSON-RPC 2.0 requests as `Content-Type: application/json`, accepting `application/json, text/event-stream`. The anonymous endpoints use stateless POST requests and return JSON. GET and DELETE return HTTP 405. No session identifier is needed.

The adapter supports protocol versions `2025-03-26`, `2025-06-18`, `2025-11-25` and `2026-07-28`. The first three use `initialize`; notifications `notifications/initialized` and `notifications/cancelled` return HTTP 202. `ping`, `tools/list` and `tools/call` are supported.

For `2026-07-28`, use `server/discover` rather than `initialize`. The request metadata must contain `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities`; mirror the protocol in `MCP-Protocol-Version` and method in `Mcp-Method`. Tool calls also require `Mcp-Name` matching the tool name. See the adapter source for exact validation.

Browser requests carrying an Origin header must use the endpoint origin or `https://thelistaccess.nl`. This is not a browser CORS proxy. Request bodies are limited to 16 KiB; JSON-RPC batches and unknown methods or arguments are rejected. Responses use `Cache-Control: no-store` and `X-Robots-Tag: noindex`.

## search_events

All arguments are optional. All supplied filters are combined. Dates use Europe/Amsterdam and include overnight events overlapping the selected days.

| Argument | Type | Meaning |
| --- | --- | --- |
| `q` | string, at most 150 characters | Event, artist or organizer text; all terms must match. |
| `city` | string, at most 100 characters | City name, such as Amsterdam or Utrecht; omit for all cities. |
| `genre` | string, at most 100 characters | Music genre, such as House or Techno; uses published genre labels and calendar aliases. |
| `venue` | string, at most 100 characters | Venue name; combine with city for similarly named venues. |
| `from` | YYYY-MM-DD string | Inclusive start date. |
| `to` | YYYY-MM-DD string | Inclusive end date; must not precede `from`. |
| `guestlist` | boolean | Public route only: true selects listed guestlist actions; admission remains unconfirmed. False does not exclude guestlists. |
| `page` | integer, 1–99999 | Result page, default 1. Use the returned `nextPage` with unchanged filters and limit. Out-of-range pages return an error. |
| `limit` | integer, 1–20 | Maximum events per page, default 10. |

`tools/list` is the machine-readable schema authority. The editorial route has the same arguments except `guestlist`, which is rejected even when false.

## Results

Successful tool calls return matching JSON in a text content block and `structuredContent`, with `isError: false`. Results include `total`, `page`, `limit`, `pages`, `hasMore`, `nextPage`, `filters`, `events`, `notice` and `documentation`. The editorial route also identifies `selection: editorial-v1`.

Public event results include canonical event links and available provenance/review fields. The editorial route uses an allowlist of factual fields and a compact `sourceReview` summary. Counts and pagination reflect its restricted selection.

Invalid tool arguments return `isError: true` without a fabricated empty result set. Transport, protocol and unknown-tool errors use JSON-RPC errors. Temporary backend errors disclose no internal storage details.
