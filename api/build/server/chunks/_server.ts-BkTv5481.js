import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, r as rooms, p as properties, i as invoices, f as contracts } from './db-B3IBLKz5.js';
import { r as requireLandlord } from './authz-CdgY0Dc1.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, count, and, inArray, sum, gte, lte } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/dashboard/stats/+server.ts
var GET = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const roomRows = await db.select({
			id: rooms.id,
			status: rooms.status
		}).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId));
		const totalRooms = roomRows.length;
		const emptyRooms = roomRows.filter((r) => r.status === "empty").length;
		const occupiedRooms = totalRooms - emptyRooms;
		const roomIdsSubquery = db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId));
		const unpaidInvoicesCount = (await db.select({ value: count() }).from(invoices).where(and(inArray(invoices.roomId, roomIdsSubquery), inArray(invoices.status, [
			"pending",
			"overdue",
			"partial"
		]))))[0]?.value ?? 0;
		const revenueResult = await db.select({ total: sum(invoices.paidAmount) }).from(invoices).where(inArray(invoices.roomId, roomIdsSubquery));
		const totalRevenue = Number(revenueResult[0]?.total ?? 0);
		const today = /* @__PURE__ */ new Date();
		const todayStr = today.toISOString().split("T")[0];
		const in30Days = new Date(today.getTime() + 720 * 60 * 60 * 1e3).toISOString().split("T")[0];
		return json({
			totalRevenue,
			emptyRooms,
			unpaidInvoices: unpaidInvoicesCount,
			expiringContracts: (await db.select({ value: count() }).from(contracts).where(and(inArray(contracts.roomId, roomIdsSubquery), eq(contracts.status, "active"), gte(contracts.endDate, todayStr), lte(contracts.endDate, in30Days))))[0]?.value ?? 0,
			totalRooms,
			occupiedRooms
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET };
//# sourceMappingURL=_server.ts-BkTv5481.js.map
