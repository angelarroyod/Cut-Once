# Phase 5.3d — Shoe rack (Zapatera)

Date: 2026-11-03 · Branch: `feat/shoe-rack`, stacked on `feat/bed-base`

The user asked for the remaining 5.3 templates to be built without a brainstorming round, so the choices below are mine.

## Goal

A shoe cabinet on a zoclo: 500–830 mm wide (830 is the most a single 18 mm shelf can span), 450–1400 mm tall, 300–400 mm deep, 1–6 fixed shelves, 0–2 doors.

## What makes it a shoe rack and not a bookshelf with doors

- The minimum shelf gap is a pair of shoes (150 mm), and the minimum depth is a shoe's length (300 mm).
- The Fibracel back stops 100 mm short of the top, so shoes behind closed doors air out. It reuses the TV stand's cable-slot idea.
- From 1200 mm tall it gets `WALL_HARDWARE` and `wallStep`, like the bookshelf.

## Validation

The same rules as its siblings: `spanIssue` on the shelves, single door up to 600 mm, a door in a pair from 200 mm, and `MIN_DOOR_THICKNESS` when it has doors.

## Out

Tilting shelves and tilt-out bins (they need special hardware), adjustable shelves (5.5 owns "who drills"), and a boot compartment.

## Clients

A thumbnail in the web and iOS `THUMBS`. Everything else derives from the `Design`.
