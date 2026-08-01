# LC-inspired battle UI asset spec

Original art for Echoes of the City combat shell. Place files under `assets/combat/ui/`. Code uses CSS fallbacks when files are missing.

## Battle console

| File | Size (px) | Notes |
|------|-----------|-------|
| `dashboard_backplate.png` | 1920 × 540 | Transparent center band for 12-col skill grid + portrait row |
| `gear_column_left.png` | 120 × 400 | Left pipe/gear column |
| `gear_column_right.png` | 120 × 400 | Right pipe/gear column |
| `start_button.png` | 128 × 128 | Gear START; optional `start_button_pressed.png` later |

## Top HUD

| File | Size (px) | Notes |
|------|-----------|-------|
| `top_hud_plate.png` | 1920 × 120 | Full-width brass plate behind counters |
| `dante_clock_face.png` | 96 × 96 | Circular gauge; needle drawn in CSS |

## Field units

| File | Size (px) | Notes |
|------|-----------|-------|
| `unit_base.png` | 128 × 48 | Red ground disc under sprites |
| `speed_hex_frame.png` | 64 × 72 | Brass hex frame for speed number |
| `enemy_hp_bar_bg.png` | 160 × 24 | Dark frame for overhead enemy HP |

## Sin rail

| File | Size (px) | Notes |
|------|-----------|-------|
| `sin_rail_frame.png` | 100 × 500 | Vertical panel on combat right edge |

## Safe zones

- Dashboard backplate: keep center 75% width × 70% height clear for interactive grid.
- Top HUD plate: keep left 35% and right 25% for counters; center can be semi-transparent.
