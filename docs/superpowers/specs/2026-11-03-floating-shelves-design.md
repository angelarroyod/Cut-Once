# Phase 5.3e — Floating shelves (Repisas flotantes)

Date: 2026-11-03 · Branch: `feat/floating-shelves`, stacked on `feat/shoe-rack`

The user asked for the remaining 5.3 templates to be built without a brainstorming round, so the choices below are mine.

## Goal

1–4 shelves with no visible brackets, the last template in 5.3's list. 400–1200 mm long, 150–300 mm deep, 70–120 mm thick, 200–500 mm of clear height between them.

## Structure

A hollow box and a hidden cleat:

- **Tapa** and **Base** (L × D), with **Frente** and 2 **Costados** between them. The back stays open.
- A **Listón de muro**, the board's thickness out from the wall, 2 mm smaller each way than the opening so the box slides over it.

The cleat goes on the wall first, level. The box slides on and is screwed to it through the Tapa and the Base.

## Why no validation of its own

- The Tapa spans at most 264 mm between the front and the cleat, under every stock's `maxSpan`, so `spanIssue` can't fire.
- The real limit is the wall and its anchors, which the engine can't see. The step warns instead: drywall needs studs or drywall anchors, and it is for light books and ornaments, not for sitting or leaning on.

No load figure is promised, since none has been tested.

## Hardware

`screw 3.5x25` and `wall-anchor 1/4"`, `⌈cleat / 300⌉ + 1` per shelf. No `mergeHardware`, as both come from the template alone. No confirmat: the pieces are too narrow for it, so the box is glued and screwed.

## 3D

Shelves are drawn from 1000 mm off the floor, only so they read as wall-mounted. The wall isn't drawn.

## Out

Steel floating-shelf brackets (hardware the yard doesn't sell), hidden drawers, shelves of different lengths.

## Clients

A thumbnail in the web and iOS `THUMBS`. Everything else derives from the `Design`.
