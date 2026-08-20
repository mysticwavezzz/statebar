# 🏛️ Law Office of M_ysticWavezzz - Discord Bot

A dedicated Discord Bot for the **Law Office of M_ysticWavezzz** Roblox Law Firm (Alyson, Harrison County).

---

## ✨ Features

- **🏛️ Firm Information & Leadership Showcase**:
  - Automatically posts firm overview embeds, leadership background (**M_ysticWavezzz** - *Acting Assistant District Attorney, Trial Bureau — Harrison County District Attorney's Office*), and specialized practice areas.
  - Styled with custom tan suit color palette (`#E2D6B5`).
  - Interactive buttons linking directly to `#consultations` and `#reviews`.
- **📋 Consultation Intake System**:
  - Direct "Request Consultation" button opening a Discord Modal intake form.
  - Collects Roblox Username, Detailed case synopsis, and Supporting Evidence.
  - Automatically spins up private `case-<username>` ticket channels inside the `Cases` category.
  - Active capacity threshold (10+ active matters) automatically queues new cases with queue notification.
  - Pings the designated **Attorney** roles and sets secure channel permissions.
- **🔒 Case Closure & Plain-Text Transcripts**:
  - One-click "Close Case" button.
  - Compiles full channel chat logs into a clean `.txt` transcript file.
  - Posts an archive summary + transcript attachment into the `#transcripts` channel and automatically deletes the ticket channel.

---

## 🚀 Setup & Configuration

### 1. Requirements
- [Node.js](https://nodejs.org/) (v16.9.0 or higher)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the credentials in `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

ATTORNEY_ROLE_ID=your_attorney_role_id_here

INFORMATION_CHANNEL_ID=your_information_channel_id_here
CONSULTATIONS_CHANNEL_ID=your_consultations_channel_id_here
REVIEWS_CHANNEL_ID=your_reviews_channel_id_here
TRANSCRIPTS_CHANNEL_ID=your_transcripts_channel_id_here

CASES_CATEGORY_ID=your_cases_category_id_here
```

### 3. Required Discord Bot Permissions & Gateway Intents
When creating your bot in the [Discord Developer Portal](https://discord.com/developers/applications):
- **Privileged Gateway Intents**: Enable **Server Members Intent** and **Message Content Intent**.
- **Bot Permissions**:
  - Manage Channels (for creating/deleting ticket channels)
  - View Channels
  - Send Messages / Send Messages in Threads
  - Embed Links
  - Attach Files
  - Read Message History
  - Manage Messages

---

## 🏃 Running the Bot

```bash
# Install dependencies
npm install

# Start the bot
npm start
```
