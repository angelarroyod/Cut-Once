# Phase 5.3b — Home-office desk (Escritorio)

Date: 2026-11-03 · Branch: `feat/desk-template`

The user asked for the remaining 5.3 templates to be built without a brainstorming round, so the choices below are mine.

## Goal

A desk a beginner orders from the lumber yard and screws together: 900–1600 mm wide, 720–780 mm tall, 450–700 mm deep, with 0–3 drawers on the right.

## Structure

- **Cubierta** (W × D) on two **Laterales** (H − t), with no screw showing on the work surface: brackets fix it from below.
- **Travesaño** (60 mm) at the front and **Faldón** (350 mm) at the back, both between the walls of the knee space and flush with the top of the sides. The faldón stops the desk racking.
- With drawers, a 400 mm **cajonera** on the right: **Divisor**, **Tapa de cajonera**, **Base** on a 70 mm **Zoclo**, and `drawerSet` between the Base and the pedestal Tapa. It has no back, so the slides get the full depth.

The pedestal's right side can't take brackets (the drawer boxes run there), so its Tapa is screwed up into the Cubierta from inside with 3.5×25, before the drawers go in.

## Validation

| Issue | `paramKey` |
|---|---|
| Board under 15 mm: too thin for a top people lean on | `material` |
| `D − 2t` over the stock's `maxSpan`. The rail and the rear panel carry the width, so the top only spans front to back | `depth` |
| Knee space under 600 mm | `drawers` |

Drawer fronts are never below `MIN_DRAWER_FRONT` in this range (the smallest is about 200 mm), so there is no issue for it.

## Hardware

- Confirmat 5×50: rail 2, rear panel 4, plus pedestal Tapa 4, Base 4, zoclo 2.
- `bracket` 2" with 4 screws 3.5×13 each: `2·⌈knee / 400⌉` along the rail and rear panel, plus 2 per knee wall. A 13 mm screw through a 2 mm bracket stays inside a 15 mm top.
- 6 screws 3.5×25 through the pedestal Tapa: at most 10 mm into the top.

## Out

Cable grommets and trays, a keyboard tray, adjustable height, a left-hand pedestal, two pedestals. No anti-tip: a desk is wider than it is tall.

## Clients

A thumbnail in the web `THUMBS` and the iOS `THUMBS`. Everything else derives from the `Design`.
