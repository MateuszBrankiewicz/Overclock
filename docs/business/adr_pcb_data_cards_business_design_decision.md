# Architectural & Business Decision Record (ADR / BDR)

**Title:** Replacing Traditional Playing Cards with Virtual Printed Circuit Boards (PCB Data Cards)  
**Status:** Accepted  
**Date:** October 2026  
**Project:** Project: Overclock (*Dead Circuit*)  
**Authors:** Architecture & Game Design Team  

---

## 1. Context & Business Problem

In bluffing / liar's bar style multiplayer games, the standard convention relies on traditional playing cards (French-suited: Aces, Kings, Queens, Jokers) or dice. Adopting this convention for *Project: Overclock* presents three major business and technical bottlenecks:

1. **Legal Exposure & Derivative Plagiarism Risks:** Replicating the dive-bar atmosphere, standard playing cards, and Russian roulette mechanics of *Liar's Bar* exposes the project to IP infringement accusations and negative community pushback.
2. **Production Overhead & 3D Asset Sourcing:** Modeling, texturing, rendering, and animating physical cards with realistic physics in 3D runtimes (Three.js / WebGL / Blender) inflates Time-to-Market by at least 2–3 months and requires dedicated 3D/shader design expertise.
3. **Web Runtime Performance Bottlenecks:** Heavy 3D assets and high-resolution texture maps penalize users on low-end laptops, integrated GPUs, and mobile web browsers, breaking our core product pillar: **Zero-Install, Instant Browser Access**.

---

## 2. Decision

We have decided to **entirely discard traditional paper cards** in favor of **digital Printed Circuit Board (PCB Data Cards)** rendered entirely via declarative frontend code (HTML5 / Tailwind CSS / Inline SVG / Framer Motion).

### 2.1. Domain & Terminology Mapping

| Conventional Concept (*Liar's Bar*) | New Equivalent (*Project: Overclock*) | Design & Business Rationale |
| :--- | :--- | :--- |
| **Aces / Kings / Queens** | **Protocols `Alpha`, `Beta`, `Gamma`** | Industrial engineering aesthetic; distinct tri-color identification (Emerald / Amber / Cyan). |
| **Joker / Devil (Wildcard)** | **`Glitch` (Override Key)** | Universal data packet matching any declared table protocol. |
| **Dead Cards / Junk Cards** | **`Corrupted` (NULL Packet)** | Forced-bluff driver: matches zero protocols, compelling the holding player to lie to purge their hand. |
| **Card Deck / Table Pile** | **Packet Stack (Data Bus)** | Hardware-native terminology aligned with the low-tech cyberpunk theme. |

---

## 3. Business & Financial Implications

### 3.1. Strategic Advantages

* **Zero Graphic Asset Acquisition Costs ($0 USD 3D Budget):**  
  PCB cards are rendered dynamically via vector SVG lines, Tailwind utility classes, and monospaced typography. No 3D modelers, custom shaders, or commercial texture licenses are required.
* **Instant Payload & Zero-Latency Boot Time:**  
  Eliminating rasterized texture files (PNG/JPG) and 3D mesh files (gLTF/OBJ) reduces the card footprint to ~10–15 KB of declarative code. The entire game interface loads instantaneously over any connection.
* **IP Protection & Brand Defensibility:**  
  Combining PCB data cards with a clandestine server bunker aesthetic firmly insulates the project from *Liar's Bar* intellectual property. The core game logic (bluffing) remains public domain, while our thematic identity forms a defendable trademark.
* **Direct Cosmetics Monetization Potential:**  
  PCB substrate layers create a structured, modular pipeline for visual customization:
  * *Substrate Variants:* Matte Black (FR-4), Military Olive, Polar White, Translucent Acrylic.
  * *Trace Metals:* Electroless Nickel Immersion Gold (ENIG), Bare Copper, RGB Luminescent Traces.
  * *Death FX & Visual States:* Blown capacitors, thermal smoke trails, cracked resin, and short-circuit sparks.

### 3.2. Trade-offs & Risk Mitigation

* **Risk: Lack of tactile depth (perceived flat UI):**  
  * *Mitigation:* Integrate CSS isometric perspective (`perspective: 1000px`, `rotateX(15deg)`), multi-layered drop shadows (`box-shadow` neon blooming), and spring-physics micro-interactions via Framer Motion.
* **Risk: Visual accessibility issues (Color Blindness):**  
  * *Mitigation:* Visual recognition does not rely exclusively on LED color hue. Each protocol integrates a distinct monospace token (`[A]`, `[B]`, `[G]`, `[!]`) alongside unique geometric SVG trace layouts.

---

## 4. Implementation Guidelines for Development

1. **Component Target:** `PcbCard.tsx` (React 19 + TypeScript).
2. **Presentation Stack:** Tailwind CSS (structural layout, contrast grids, typography), Framer Motion (3D flip `rotateY: 180deg`, spring-based hand elevation), inline SVG (procedural trace lines and solder pads).
3. **Strict State Isolation:** The visual card component is completely stateless. Card identities (`Alpha`, `Beta`, etc.) are delivered via sanitized server DTOs and remain hidden server-side until the verification (`TRACE`) sequence formally resolves.