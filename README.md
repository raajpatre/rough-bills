<p align="center">
  <img src="https://github.com/user-attachments/assets/e1673abc-2be5-40a8-b7f3-852a23aebf9c" alt="Rough Bills Logo" width="120" />
</p>

<h1 align="center">Rough Bills</h1>

<p align="center">
  <em>Track the hangout, not the math.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/raajpatre/rough-bills?style=for-the-badge&color=FFD700" alt="Stars" />
  <img src="https://img.shields.io/github/last-commit/raajpatre/rough-bills?style=for-the-badge&color=00C7B7" alt="Last Commit" />
  <img src="https://img.shields.io/github/languages/top/raajpatre/rough-bills?style=for-the-badge&color=646CFF" alt="Top Language" />
</p>

<p align="center">
  <a href="https://rough-bills.vercel.app">🌐 Live Demo</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-the-algorithm">Algorithm</a> ·
  <a href="#-getting-started">Getting Started</a>
</p>

---

## 📸 Gallery

<table>
  <tr>
    <td align="center"><strong>Landing & Login</strong></td>
    <td align="center"><strong>Active Hangouts</strong></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/f77d3feb-f20a-4000-89e9-fefb9998ed8b" alt="Login screen" width="100%" /></td>
    <td><img src="https://github.com/user-attachments/assets/d15af4f2-9678-4bc7-8f01-4dbd425849d4" alt="Dashboard" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Hangout Detail & Settlements</strong></td>
    <td align="center"><strong>Expense & Payment History</strong></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/b58a4f23-a64a-4e56-a9f5-343c2b6c14ac" alt="Hangout detail" width="100%" /></td>
    <td><img src="https://github.com/user-attachments/assets/c117d387-8c9c-469c-82ff-31a279999e6d" alt="Expense history" width="100%" /></td>
  </tr>
</table>

---

## 📖 Overview

Every student group trip ends the same way — nobody knows who owes what, the mental math doesn't add up, and the WhatsApp messages go on for days.

**Rough Bills** solves this without a spreadsheet.

Create a hangout, share a room code, log who paid for what — and Rough Bills calculates the fewest number of payments needed for everyone to settle up. No more overcounting. No more awkward debt arithmetic. When the hangout closes, final dues are locked in and members can mark payments against them.

The design is intentional: warm paper textures, hand-drawn aesthetic, dashed borders. Most expense apps feel like bank software. This one feels like something you'd sketch on a napkin — because that's exactly what the problem is.

---

## ✨ Features

- **Hangout rooms** — Create a session with a name, get a short room code, and share it with the group. No email required to join.
- **Real-time expense logging** — Any member logs an expense (paid by whom, split across whom), and the running balances update immediately.
- **Minimum cash flow settlements** — When a hangout closes, the app calculates the mathematically optimal settlement plan — the fewest number of transfers needed to make everyone whole.
- **Post-hangout payment tracking** — After closing, members mark individual payments against the final dues. Balances update as payments clear.
- **Hangout history** — Every closed hangout is archived with its full expense log, settlement plan, and payment trail.
- **Username-only auth** — No email required. Create an account with just a username and password — keeps the UX fast and friction-free.

---

## 🧠 The Algorithm

The core settlement logic uses a **minimum cash flow** approach:

1. After all expenses are logged, each member's net position is calculated: what they paid out minus what they owe.
2. Members with a positive net position are creditors; members with a negative net position are debtors.
3. A greedy algorithm matches the largest debtor with the largest creditor, records the transfer, and repeats until all balances clear.

This minimizes the total number of transactions needed — a group of *n* members always settles in at most *n - 1* transfers, regardless of how many individual expenses were logged.

The implementation lives in `server/src/lib/calculations/` and is fully unit-tested (11 tests, 0 failures):

```
✔ splits a single expense equally across two members
✔ handles multiple expenses with alternating payers
✔ greedy matching reduces transfers for multiple creditors and debtors
✔ omits zero-net users from balances and settlements
✔ distributes remainder deterministically by member order
✔ returns no balances and no settlements for empty expense arrays
✔ rejects expenses whose payer is not a hangout member
✔ calculateDirectSettlements preserves pairwise dues while netting opposite-direction spend
✔ full payment clears the outstanding due
✔ partial payment only reduces the remaining due
✔ buildArchivedDebtSummary uses only remaining closed-hangout dues
```

---

## 🛠️ Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Auth | JWT (username-based, no email required) |
| Hosting | Vercel (frontend) · Railway or Render (backend) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database URL (Neon recommended for free tier)

### Installation

```bash
git clone https://github.com/raajpatre/rough-bills.git
cd rough-bills
npm install
```

### Environment

Create a root `.env`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-here"   # generate with: openssl rand -hex 32
CLIENT_ORIGIN="http://localhost:5173"
PORT=4000
```

### Run

```bash
npm run prisma:generate
npm run dev:server
npm run dev:client
```

For first-time database setup:

```bash
npm run prisma:migrate --workspace server
```

---

## 🚢 Production Deployment

**Frontend (Vercel)**
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-backend-domain.com/api`

**Backend (Railway / Render)**
- Root: `server`
- Start command: `node src/server.js`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`, `PORT`

---

## 📄 License

MIT — open to use, adapt, and deploy.

---

<p align="center">
  If Rough Bills saved you from a group chat argument, consider dropping a ⭐ — it helps.
</p>

<p align="center">
  <em>Made with ❤️ by <a href="https://github.com/raajpatre">raajpatre</a></em>
</p>
