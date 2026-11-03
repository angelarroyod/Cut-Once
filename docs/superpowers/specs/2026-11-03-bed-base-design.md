# Phase 5.3c — Bed base with drawers (Base de cama)

Date: 2026-11-03 · Branch: `feat/bed-base`, stacked on `feat/desk-template`

The user asked for the remaining 5.3 templates to be built without a brainstorming round, so the choices below are mine.

## Goal

A base the exact size of its mattress, picked from a select, because nobody types a mattress size: Individual 100 × 190, Matrimonial 135 × 190, Queen 150 × 200, King 190 × 200 cm. Height 300–500 mm, with or without two drawers.

## Structure

- Two **Laterales** (L × H), a **Cabecero**, a **Larguero central**, and a **Piecero** when there are no drawers.
- No sheet holds a one-piece deck, so the **plataforma** comes in strips laid across the bed. Each seam lands on a pair of 80 mm **Costillas**, one each side of the spine.
- A strip is at most 600 mm, or the stock's `maxSpan` if lower. That makes the span always valid, so there is no span issue: the strip count adapts instead.
- Boards under 15 mm are rejected (`material`).

## Drawers at the foot

`drawerSet` opens only toward +z, so the drawers open at the foot and +z is the foot. Side drawers would mean teaching the block a second direction, and most beds have a wall or a nightstand on one side anyway. They need about 50 cm clear in front; the template's description says so.

- The foot rail goes away. Two **Travesaños** carry the deck's free edge over the drawers.
- Each drawer bay gets a **Base** on a 70 mm **Zoclo**.
- The zone is 430 mm long for a 16" slide. A dedicated **Tabla al pie** covers it, with its seam on the first pair of ribs, so no rib crosses a drawer.

## Hardware

- Confirmat 5×50: rails, spine, ribs (1 per end, offset up and down at the spine so they don't collide), and 2 per deck strip end through the sides.
- Screws 3.5×40 every 300 mm from the deck into its supports. The mattress hides the heads.

## Banding

Only the sides' top and foot end, and the foot strip over the drawers. Without drawers the last strip's foot edge stays bare, above the Piecero: a separate panel just to band it isn't worth a second size in the order.

## Out

Headboards, side drawers, a lifting deck, slatted decks (they need solid-wood stock, which the catalog doesn't have) and legs.

## Clients

A thumbnail in the web and iOS `THUMBS`. Everything else derives from the `Design`.
