import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, h as expenses } from './db-DPjKSjsC.js';
import { r as requireLandlord, f as forbidden, l as landlordOwnsProperty } from './authz-Cca2HujG.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, like, desc, and } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/expenses/+server.ts
async function landlordOwnsExpense(landlordId, expenseId) {
	return !!await db.query.expenses.findFirst({
		where: and(eq(expenses.id, expenseId), eq(expenses.landlordId, landlordId)),
		columns: { id: true }
	});
}
var GET = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const month = url.searchParams.get("month");
		const conditions = [eq(expenses.landlordId, landlordId)];
		if (month) conditions.push(like(expenses.date, `${month}%`));
		return json(await db.query.expenses.findMany({
			where: and(...conditions),
			with: { property: { columns: {
				name: true,
				shortName: true
			} } },
			orderBy: desc(expenses.date)
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const { propertyId, category, description, amount, date, notes } = await request.json();
		if (!landlordId || !category || !description || amount === void 0 || !date) return json({ error: "Thiếu thông tin chi phí bắt buộc" }, { status: 400 });
		if (propertyId && !await landlordOwnsProperty(landlordId, propertyId)) return forbidden();
		return json((await db.insert(expenses).values({
			landlordId,
			propertyId: propertyId || null,
			category,
			description,
			amount: Number(amount),
			date,
			notes: notes || null
		}).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const { id, propertyId, category, description, amount, date, notes } = await request.json();
		if (!id) return json({ error: "Missing expense ID" }, { status: 400 });
		if (!await landlordOwnsExpense(auth.value, id)) return forbidden();
		if (propertyId && !await landlordOwnsProperty(auth.value, propertyId)) return forbidden();
		const updateData = {};
		if (propertyId !== void 0) updateData.propertyId = propertyId || null;
		if (category !== void 0) updateData.category = category;
		if (description !== void 0) updateData.description = description;
		if (amount !== void 0) updateData.amount = Number(amount);
		if (date !== void 0) updateData.date = date;
		if (notes !== void 0) updateData.notes = notes;
		if (Object.keys(updateData).length === 0) return json({ error: "No fields to update" }, { status: 400 });
		return json((await db.update(expenses).set(updateData).where(eq(expenses.id, id)).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const id = url.searchParams.get("id");
		if (!id) return json({ error: "Missing expense ID" }, { status: 400 });
		if (!await landlordOwnsExpense(auth.value, id)) return forbidden();
		await db.delete(expenses).where(eq(expenses.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-DZu00En-.js.map
