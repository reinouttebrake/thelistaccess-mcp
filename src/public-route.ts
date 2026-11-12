// Public calendar tools only; Sites owns the separate OAuth-protected /mcp URL.
import {eventMcpResponse} from '@/lib/event-mcp';
export const dynamic='force-dynamic';
export const POST=eventMcpResponse;
export const GET=eventMcpResponse;
export const DELETE=eventMcpResponse;
