import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, i as invoices, r as rooms, p as properties, h as expenses } from './db-DPjKSjsC.js';
import { r as requireLandlord } from './authz-Cca2HujG.js';
import { j as json } from './index-CLnuRv4X.js';
import { inArray, eq } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/finance/+server.ts
var GET = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const monthCount = Math.min(Number(url.searchParams.get("months")) || 6, 24);
		const invoiceRows = await db.select({
			month: invoices.month,
			paidAmount: invoices.paidAmount
		}).from(invoices).where(inArray(invoices.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId))));
		const expenseRows = await db.select({
			date: expenses.date,
			amount: expenses.amount,
			category: expenses.category
		}).from(expenses).where(eq(expenses.landlordId, landlordId));
		const now = /* @__PURE__ */ new Date();
		const months = [];
		for (let i = monthCount - 1; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			months.push(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`);
		}
		const revenueByMonth = /* @__PURE__ */ new Map();
		for (const inv of invoiceRows) revenueByMonth.set(inv.month, (revenueByMonth.get(inv.month) ?? 0) + inv.paidAmount);
		const expenseByMonth = /* @__PURE__ */ new Map();
		const expenseByCategory = /* @__PURE__ */ new Map();
		for (const exp of expenseRows) {
			const month = exp.date.slice(0, 7);
			expenseByMonth.set(month, (expenseByMonth.get(month) ?? 0) + exp.amount);
			if (months.includes(month)) expenseByCategory.set(exp.category, (expenseByCategory.get(exp.category) ?? 0) + exp.amount);
		}
		const monthly = months.map((month) => {
			const revenue = revenueByMonth.get(month) ?? 0;
			const expense = expenseByMonth.get(month) ?? 0;
			return {
				month,
				revenue,
				expense,
				profit: revenue - expense
			};
		});
		const totalRevenue = monthly.reduce((sum, m) => sum + m.revenue, 0);
		const totalExpense = monthly.reduce((sum, m) => sum + m.expense, 0);
		return json({
			monthly,
			totalRevenue,
			totalExpense,
			totalProfit: totalRevenue - totalExpense,
			expenseByCategory: Object.fromEntries(expenseByCategory)
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET };
//# sourceMappingURL=_server.ts-BiqW2HQW.js.map
