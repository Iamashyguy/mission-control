import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Company data (static for now — can be moved to a DB or config file later)
const companies = [
  {
    id: "india-prop",
    name: "Proprietorship (India)",
    country: "India",
    flag: "🇮🇳",
    type: "Sole Proprietorship",
    status: "active",
    filings: [
      { name: "GST Return (GSTR-3B)", frequency: "Monthly", nextDue: getNextMonthly(20), status: "pending" },
      { name: "GST Return (GSTR-1)", frequency: "Monthly", nextDue: getNextMonthly(11), status: "pending" },
      { name: "Income Tax Return (ITR)", frequency: "Yearly", nextDue: "2026-07-31", status: "upcoming" },
      { name: "Advance Tax Q1", frequency: "Quarterly", nextDue: "2026-06-15", status: "upcoming" },
      { name: "TDS Return", frequency: "Quarterly", nextDue: getNextQuarterly(), status: "pending" },
    ],
  },
  {
    id: "uk-ltd",
    name: "UK Private Limited",
    country: "United Kingdom",
    flag: "🇬🇧",
    type: "Private Limited Company",
    status: "active",
    filings: [
      { name: "Annual Accounts", frequency: "Yearly", nextDue: "2026-09-30", status: "upcoming" },
      { name: "Confirmation Statement", frequency: "Yearly", nextDue: "2026-06-30", status: "upcoming" },
      { name: "Corporation Tax Return", frequency: "Yearly", nextDue: "2026-12-31", status: "upcoming" },
      { name: "VAT Return", frequency: "Quarterly", nextDue: getNextQuarterly(), status: "pending" },
    ],
  },
  {
    id: "us-llc",
    name: "US LLC",
    country: "United States",
    flag: "🇺🇸",
    type: "Limited Liability Company",
    status: "active",
    filings: [
      { name: "Annual Report", frequency: "Yearly", nextDue: "2026-04-15", status: "upcoming" },
      { name: "Federal Tax Return", frequency: "Yearly", nextDue: "2026-04-15", status: "upcoming" },
      { name: "State Franchise Tax", frequency: "Yearly", nextDue: "2026-05-15", status: "upcoming" },
      { name: "FBAR (Foreign Bank Accounts)", frequency: "Yearly", nextDue: "2026-04-15", status: "upcoming" },
    ],
  },
];

// Calculate urgency
const now = new Date();
for (const company of companies) {
  for (const filing of company.filings) {
    const dueDate = new Date(filing.nextDue);
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      filing.status = "overdue";
    } else if (daysUntil <= 7) {
      filing.status = "urgent";
    } else if (daysUntil <= 30) {
      filing.status = "upcoming";
    } else {
      filing.status = "pending";
    }
  }
}

export async function GET() {
  const allFilings = companies.flatMap((c) =>
    c.filings.map((f) => ({ ...f, company: c.name, companyId: c.id, flag: c.flag }))
  );

  // Sort by due date
  allFilings.sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime());

  const overdue = allFilings.filter((f) => f.status === "overdue").length;
  const urgent = allFilings.filter((f) => f.status === "urgent").length;
  const upcoming = allFilings.filter((f) => f.status === "upcoming").length;

  return NextResponse.json({
    companies,
    allFilings,
    summary: {
      totalCompanies: companies.length,
      totalFilings: allFilings.length,
      overdue,
      urgent,
      upcoming,
    },
  });
}

function getNextMonthly(day: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), day);
  if (target <= now) target.setMonth(target.getMonth() + 1);
  return target.toISOString().split("T")[0];
}

function getNextQuarterly(): string {
  const now = new Date();
  const month = now.getMonth();
  const quarterEndMonths = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec
  let nextEnd = quarterEndMonths.find((m) => m > month);
  if (nextEnd === undefined) nextEnd = quarterEndMonths[0];
  const year = nextEnd < month ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, nextEnd + 1, 0).toISOString().split("T")[0]; // Last day of quarter end month
}
