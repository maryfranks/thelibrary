# Project Master Plan: Old-School Text Adventure Game & Frontend Instrumentation

## Part 1: Single-Page Application & Cloudflare Pages Deployment

### 1. Project Overview & Objectives
* **Objective:** Build, structure, and deploy a single-page text adventure game (`The Library`) as a standalone static web application.
* **Hosting & Domain:** Static deployment to Cloudflare Pages at `thelibrary.littlefuzzydinos.com`.
* **Architecture Principle:** Strict separation of concerns between the frontend UI shell, native JavaScript execution engine, and decoupled JSON content payload.

### 2. Component Architecture
* **Frontend UI Shell (Lovable Generated):** 
  * Retro terminal emulator layout implementing Spectral serif headers, IBM Plex Mono typography, blinking brass cursor blocks (`▌`), and footer navigation links (`[ GitHub Repository ]` and `[ The Chartroom ]`).
  * Self-contained local state loop in the single-page application handling command inputs, text history output, and game state locally in the browser.
* **Game Engine (`engine.js`):** 
  * Pure execution logic written in native JavaScript.
  * Handles state management, command parsing, inventory checks, condition evaluation, and dynamic DOM rendering without embedding narrative strings.
* **Content Payload (`content.json`):** 
  * Fully populated and finalized data payload structured with stages, node IDs, commands, transition targets, and terminal metrics flags (e.g., `is_death`, `death_type`, `death_text`).

### 3. Implementation Phases
* **Phase 1: Frontend UI & Terminal Generation**
  * Input brand design guidelines and the terminal prompt specification into Lovable to generate the complete UI shell.
  * Validate DOM text injection and event listener integration for the local state loop.
* **Phase 2: Game Engine & Content Integration**
  * Implement `engine.js` execution logic for state handling, command parsing, and condition evaluation.
  * Integrate the finalized `content.json` payload into the single-page application structure.
* **Phase 3: Telemetry Instrumentation & Pipeline Verification**
  * Instrument the frontend application to capture game outcomes and dispatch OpenTelemetry metrics to the shared OTel collector endpoint during active gameplay testing.
  * Verify that telemetry payloads successfully register in Grafana during test runs.
* **Phase 4: Cloudflare Deployment**
  * Build the static single-page application assets.
  * Deploy the application to Cloudflare Pages with custom domain routing configured at `thelibrary.littlefuzzydinos.com`.

---

## Part 2: Shared Observability & Infrastructure (Separate Concern)

*Note: This infrastructure operates as a centralized, shared resource stack independent of the application codebase.*

### 1. Centralized OTel Collector & Grafana Pipeline
* **Hosting:** Google Cloud Platform (GCP) Always-Free `e2-micro` virtual machine (2 vCPUs, 1 GB RAM) running in a US region with a 30 GB persistent disk.
* **Orchestration:** Docker and Docker Compose managing containerized services for both the OpenTelemetry Collector and Grafana on the shared instance.
* **Configuration (`otel-collector-config.yaml`):**
  * **Receiver:** Configured to listen on port `4318` for incoming OTLP HTTP payloads originating from the frontend game and other shared applications.
  * **Exporter:** Routes telemetry data directly into Grafana (or any OTel-compatible visualization sink) for real-time dashboard monitoring of player survival statistics and outcome distributions.