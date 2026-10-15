# Binaire - Freznel AI Assessment: System Tasks & Sensor Info Viewer

A high-performance, terminal-based system task and hardware sensor viewer built with **Node.js**, **TypeScript**, and **neo-blessed**, featuring **Firebase Authentication** and adhering to strict **Object-Oriented Programming (OOP)** design principles.

The terminal dashboard is modeled after the `btop` / `bpytop` aesthetic specified in the assessment requirements, providing dense real-time hardware telemetry and interactive process management.

---

## Architecture & OOP Design

The codebase strictly decouples data collection, authentication, domain modeling, and terminal rendering into dedicated classes:

* **Data Services (`src/api/`)**:
  * [`SystemMetricsService`](src/api/SystemMetricsService.ts): Collects CPU, memory, disk I/O, network throughput, and battery data using `systeminformation` and Node.js native `os`. Calculates delta rates over time and handles OS-specific sensor fallbacks.
  * [`ProcessService`](src/api/ProcessService.ts): Queries running processes, provides multi-criteria sorting and real-time filtering, enforces critical system process protections, and handles cross-platform process termination (`taskkill` on Windows / `kill -9` on Unix).
* **Authentication Engine (`src/auth/`)**:
  * [`IAuthService`](src/auth/IAuthService.ts): Abstract interface defining authentication contracts (`signUp`, `signIn`, `signOut`, `isAuthenticated`, `getCurrentUser`).
  * [`FirebaseAuthService`](src/auth/FirebaseAuthService.ts): Communicates with the official Firebase Auth REST API (Google Identity Toolkit), managing user sessions and translating error codes.
* **Domain Models (`src/models/`)**:
  * [`SystemSnapshotModel`](src/models/SystemSnapshotModel.ts): Immutable snapshot encapsulating hardware metrics with formatting helpers for bytes, throughput rates, and uptime.
* **Terminal UI Components (`src/components/`)**:
  * [`UIManager`](src/components/UIManager.ts): Manages `blessed.screen` lifecycle, Windows terminal dimension fallbacks, and global interrupt handling.
  * [`BasePanel`](src/components/BasePanel.ts): Abstract base class for framed terminal panels supporting focus states and dynamic border highlighting.
  * [`CpuPanel`](src/components/CpuPanel.ts): Top panel displaying CPU usage graph, per-core load, clock speed, temperatures, battery status, load averages, and GPU telemetry.
  * [`MemoryPanel`](src/components/MemoryPanel.ts): Memory breakdown (Total, Used, Available, Cached, Committed, GPU Shared) with segmented usage bars.
  * [`DiskPanel`](src/components/DiskPanel.ts): Mounted drive capacity, free/used percentages, and real-time read/write I/O throughput.
  * [`NetworkPanel`](src/components/NetworkPanel.ts): Active network interface, IP address, download/upload rates with bitrate indicators, totals, and I/O sparkline.
  * [`ProcessPanel`](src/components/ProcessPanel.ts): High-density process table with column alignment, windowed scrolling, and cursor tracking.
  * [`AuthView`](src/components/AuthView.ts): Terminal authentication gate with Sign In / Sign Up modes, input validation, and masked password entry.
  * [`DialogManager`](src/components/DialogManager.ts): Centralized modal controller handling search prompts, process detail inspection, and termination confirmation dialogs.
  * [`DashboardView`](src/components/DashboardView.ts): Orchestrator running the 1500ms refresh loop, panel tab cycling, and terminal resize validation.

---

## Prerequisites

* **Node.js**: `v20.0.0` or higher (`v24.x` recommended).
* **Operating System**: Windows (PowerShell / Command Prompt) or macOS / Linux.

---

## Installation

1. Clone or navigate to the repository:
   ```bash
   cd Binaire-FreznelAI-Assessment
   ```

2. Install dependencies:
   ```powershell
   # On Windows PowerShell:
   npm.cmd install

   # On macOS / Linux:
   npm install
   ```

---

## Firebase Configuration

The application uses **Firebase Authentication** as required by the assessment brief.

1. **Create or Open a Firebase Project**:
   * Navigate to the [Firebase Console](https://console.firebase.google.com/).
   * Create a new project (e.g. `binaire-system-viewer`).
2. **Enable Email/Password Sign-In**:
   * In the Firebase Console, go to **Build** > **Authentication** > **Sign-in method**.
   * Enable the **Email/Password** provider and click **Save**.
3. **Get Your Web API Key**:
   * In the Firebase Console, click the **Gear Icon** (Project Settings) > **General**.
   * Under **Your apps**, create a Web app or copy the existing `apiKey` and `projectId`.
4. **Create Local `.env`**:
   * Copy the template:
     ```powershell
     Copy-Item .env.example .env
     ```
   * Populate `.env` with your Firebase credentials:
     ```bash
     FIREBASE_API_KEY=AIzaSy...YourRealApiKey
     FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
     FIREBASE_PROJECT_ID=your-project-id
     ```

> **Note**: If `.env` is unconfigured, the application gracefully prompts you with an error message on the authentication screen without crashing.

---

## Running the Application

### 1. Interactive Terminal Application
```powershell
npm.cmd start
```
* If unauthenticated, the **Firebase Authentication** screen appears first.
* Toggle between **[Sign In]** and **[Sign Up]** using the arrow keys or `Tab`.
* Enter your email and password, then press `Enter` to access the live dashboard.

### 2. Headless Automated System & Architecture Check
```powershell
npm.cmd run check
```
Runs a non-interactive self-test verifying system metrics retrieval, OOP service instantiation, and hardware telemetry without opening a full terminal UI.

### 3. Production Build
```powershell
npm.cmd run build
```
Compiles TypeScript files into production-ready CommonJS modules in `dist/`.

### 4. TypeScript Typecheck
```powershell
npm.cmd run typecheck
```
Executes `tsc --noEmit` across the entire project.

---

## Keyboard Navigation & Shortcuts

### Dashboard & Navigation
| Key | Context | Action |
| :--- | :--- | :--- |
| `Up` / `k` | Process Table | Navigate cursor up to previous process |
| `Down` / `j` | Process Table | Navigate cursor down to next process |
| `PageUp` / `PageDown` | Process Table | Scroll through processes by page height |
| `Home` / `End` | Process Table | Jump to top or bottom of process list |
| `Tab` | Global Dashboard | Cycle focus between panels (`CPU` → `Mem` → `Disks` → `Net` → `Proc`) |
| `Shift + Tab` | Global Dashboard | Cycle focus backward between panels |
| `Enter` | Process Table | Open process detail inspection modal |
| `/` | Global Dashboard | Open search/filter prompt |
| `s` | Global Dashboard | Cycle sort column (`CPU` → `MEM` → `PID` → `NAME` → `USER`) |
| `r` | Global Dashboard | Reverse sort direction (ascending `▲` / descending `▼`) |
| `t` | Process Table | Request process termination with confirmation modal |
| `Escape` | Modals / Filters | Close active modal, cancel termination, or clear search filter |
| `q` | Global Dashboard | Clean application exit (disabled while typing in search box) |
| `Ctrl + C` | Anywhere | Force exit application |

### Authentication Screen
| Key | Action |
| :--- | :--- |
| `Tab` / `Down` | Next input field (Mode Tabs → Email → Password → Submit) |
| `Shift + Tab` / `Up` | Previous input field |
| `Left` / `Right` | Toggle between **Sign In** and **Sign Up** |
| `Enter` | Submit credentials to Firebase |
| `Ctrl + C` | Exit terminal |

---

## Process Safety Features

* **Critical Process Protection**: Prevents terminating critical system components (`PID 0`, `PID 4`, `csrss.exe`, `smss.exe`, `services.exe`, `lsass.exe`, `wininit.exe`, `svchost.exe`, `init`, `systemd`) and the current application process (`process.pid`).
* **Confirmation Gate**: Any termination request displays a confirmation dialog showing the process name and PID before executing.
* **Cross-Platform Termination**: Dispatches `taskkill /PID <pid> /F` on Windows and `kill -9 <pid>` on POSIX systems.

---

## Known Limitations & OS-Specific Differences

1. **Hardware Sensors & CPU Temperature on Windows**:
   * On Windows, ACPI thermal zone data (`MSAcpi_ThermalZoneTemperature`) often requires administrative privileges or third-party kernel drivers (e.g. LibreHardwareMonitor).
   * In compliance with assessment instructions, **real metrics are queried and unavailable sensors display `N/A`** rather than fabricated values.
2. **System Load Average on Windows**:
   * Node's `os.loadavg()` returns `[0, 0, 0]` on Windows because Windows does not calculate Unix-style load averages natively. The application computes an exponential moving average (EMA) of normalized processor load over 1, 5, and 15-minute windows.
3. **Terminal Resizing**:
   * Minimum terminal viewport size is **80 columns × 24 rows**. If resized below this threshold, a prominent warning box prompts the user to enlarge the terminal.
