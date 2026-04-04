# Future Work

Items explicitly deferred during v1 planning and implementation.

## Multi-page tracking

V1 only compares page N against page N-1. A story could slip through a longer gap (e.g., rising from page 3 to page 1 while the user moves from page 1 to page 3). Tracking the full page chain would catch these but adds complexity.

## Other listing pages

V1 only runs on `/news` and `/`. The same pagination gap problem applies to `/newest`, `/front`, `/ask`, `/show`, and other paginated listings.
