User-authored battle definition scripts live in this folder.

There are two supported ways to add custom content:

1. Data-only JSON packs imported through the battle UI (recommended for sharing).
2. Trusted JavaScript packs placed in `battle/content/packs/user/**` (advanced; runs code).

Data-only packs must be plain JSON and cannot contain functions. They should include a `manifest` object plus `statuses`, `units`, and/or `battles` arrays.

Examples:
- `battle/content/packs/user/examples/minimal-pack.json`
- `battle/content/packs/user/examples/advanced-pack.json`
