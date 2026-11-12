# The List Access MCP adapter

Public source snapshot and documentation for the read-only MCP event-search adapter at [The List Access](https://thelistaccess.nl).

| Connection | URL |
| --- | --- |
| Public event calendar | `https://thelistaccess.nl/api/mcp` |
| Restricted editorial calendar | `https://thelistaccess.nl/api/mcp/claude` |
| User guide | https://thelistaccess.nl/events/data/mcp |
| Registry name | `nl.thelistaccess/events` |

## Connect

Add a remote MCP server in your client using the public endpoint above. The endpoint uses Streamable HTTP and requires no account or API key. It accepts JSON-RPC POST requests; opening it as a normal browser page returns HTTP 405. Read the user guide in a browser instead.

The server exposes one tool, `search_events`, with optional event/artist/organizer text, city, genre, venue, dates and pagination. The public route also accepts `guestlist`; the editorial route does not. See [the protocol and arguments](docs/PROTOCOL.md).

```sh
curl --fail-with-body https://thelistaccess.nl/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"example-client","version":"1.0"}}}'

curl --fail-with-body https://thelistaccess.nl/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_events","arguments":{"city":"Amsterdam","genre":"Techno","limit":5}}}'
```

## Source scope

[`src/event-mcp.ts`](src/event-mcp.ts) is the deployed adapter source, including transport handling, tool schemas, argument validation and response projection. The two route files show the public and editorial entry points. These are byte-for-byte snapshots of the owning application files, with their original imports retained.

This repository is an inspectable adapter snapshot, not a standalone server distribution. The calendar API, editorial selection implementation, website framework and deployment infrastructure remain in the owning application. They are not bundled here. See [source provenance and integration boundaries](docs/SOURCE.md).

Registry version **1.0.2** adds this repository link. The deployed adapter still reports **1.0.1**; this registry metadata update does not change runtime behavior.

## Data and access limits

The calendar is a curated selection, not a complete inventory of Dutch events. Source-review warnings remain unresolved unless supported by new evidence. Stored ticket status does not verify current prices, fees or stock; use the official ticket shop linked from the event page. A guestlist action or group membership does not confirm admission.

The editorial route excludes known campaigns, guestlists, List offers and detected promotional or affiliate content before filtering and pagination. It returns a restricted factual projection without ticket links, prices or artwork. Canonical website pages are separate and may contain commercial navigation.

Both tools are read-only. They do not buy tickets, register guests, send messages or modify the calendar. This repository does not grant rights to event artwork, source material or event data.

[Usage terms](https://thelistaccess.nl/gebruiksvoorwaarden) · [Privacy](https://thelistaccess.nl/privacy)
