# Portfolio Pulse

A signed-in PMO health briefing. SQL is the source of truth. Calculated colour is compared to what the PM reported.

**Live:** [https://portfolio-pulse-psi.vercel.app](https://portfolio-pulse-psi.vercel.app)

Sample data is as of **9 October 2026**, CAD, 150 projects across 8 programs.

---

## Run it

```bash
git clone <this-repo>
cd portfolio-pulse
npm install --legacy-peer-deps
npm test
npm run dev             # http://localhost:3000
```

Sign in as **Daniel Demir** (PMO Admin) to see the whole book. **Zoe Sato** is a viewer with no money.

You should land on Home with program folders. Case Management Platform Implementation (PRJ-069) is a watermelon: PM Green, data Red.

---

## How to use

1. **Home**: program folders, then briefing counts. Tap a count for this week's exceptions.
2. Five tabs: **Home / Projects / People / Money / Risks**. Briefing is not a sixth tab.
3. Open a project for calculated vs reported colour, why, dates, RAID, team.
4. Gear is **Data status**: as-of date, health rules, load history.
5. Access is per user. Money is omitted when the account cannot see financials.

Missing inputs show **n/a**. Missing reported RAG is **No status**, never a fake Green.

---

## Data

The app reads [`data/portfolio_pulse.db`](data/portfolio_pulse.db). Schema, generator, and the Excel mirror live in the sibling folder `pulse-pmo-sample`.

```bash
cd ../pulse-pmo-sample
python generate_pulse_data.py
# then copy portfolio_pulse.db into this repo's data/ folder
```

Do not point Book at the sample Excel. That ingest path is gone.

---

## About me

I'm [Abhay Sharma](https://abhay-sharma.com), a product designer and educator in Toronto.

More work: [abhay-sharma.com](https://abhay-sharma.com) · [GitHub](https://github.com/Abhay-2222)
