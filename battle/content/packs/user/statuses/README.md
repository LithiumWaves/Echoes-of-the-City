User-authored status definition scripts live in this folder.

There are two supported ways to add custom content:

1. Data-only JSON packs imported through the battle UI (recommended for sharing).
2. Trusted JavaScript packs placed in `battle/content/packs/user/**` (advanced; runs code).

Data-only packs must be plain JSON and cannot contain functions. They should include a `manifest` object plus `statuses`, `units`, and/or `battles` arrays.

Examples:
- `battle/content/packs/user/examples/minimal-pack.json`
- `battle/content/packs/user/examples/advanced-pack.json`

## Creator UI status editor

Open the in-game Creator, choose **Editor → Statuses**, then press **New Status** to build a status without writing a full pack by hand. The editor exposes common fields (id, name, label, icon path, tags, and count-only mode) plus raw JSON sections for the stack model and lifecycle hooks, so advanced statuses can still use every supported hook action and condition. Save to Workshop to persist the status locally; exported Workshop packs include the custom status under the `statuses` array.
