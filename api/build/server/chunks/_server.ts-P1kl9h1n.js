import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, f as contracts, r as rooms, p as properties } from './db-B3IBLKz5.js';
import { r as requireLandlord, c as landlordOwnsContract, f as forbidden, a as landlordOwnsRoom, b as landlordOwnsTenant } from './authz-CdgY0Dc1.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, inArray, and, desc } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/contracts/+server.ts
var GET = async ({ url, locals }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		const tenantId = url.searchParams.get("tenantId");
		let condition;
		if (locals.session?.role === "LANDLORD") {
			const ownScope = inArray(contracts.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, locals.session.landlordProfileId)));
			condition = tenantId ? and(ownScope, eq(contracts.tenantId, tenantId)) : ownScope;
		} else if (locals.session?.role === "TENANT") condition = eq(contracts.tenantId, locals.session.tenantProfileId);
		else if (landlordId) condition = inArray(contracts.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId)));
		else if (tenantId) condition = eq(contracts.tenantId, tenantId);
		else return json({ error: "Missing landlordId or tenantId" }, { status: 400 });
		return json(await db.query.contracts.findMany({
			where: condition,
			with: {
				tenant: { with: { user: { columns: {
					name: true,
					phone: true
				} } } },
				room: { with: { property: { columns: {
					name: true,
					shortName: true
				} } } }
			},
			orderBy: desc(contracts.createdAt)
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const { tenantId, roomId, startDate, endDate, monthlyRent, deposit, fileUrl, notes } = await request.json();
		if (!tenantId || !roomId || !startDate || !endDate || monthlyRent === void 0) return json({ error: "Thiếu thông tin hợp đồng bắt buộc" }, { status: 400 });
		if (!await landlordOwnsRoom(auth.value, roomId) || !await landlordOwnsTenant(auth.value, tenantId)) return forbidden();
		return json((await db.insert(contracts).values({
			tenantId,
			roomId,
			startDate,
			endDate,
			monthlyRent: Number(monthlyRent),
			deposit: deposit !== void 0 ? Number(deposit) : 0,
			fileUrl: fileUrl || null,
			notes: notes || null,
			status: "active"
		}).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const { id, startDate, endDate, monthlyRent, deposit, fileUrl, notes, status } = await request.json();
		if (!id) return json({ error: "Missing contract ID" }, { status: 400 });
		if (!await landlordOwnsContract(auth.value, id)) return forbidden();
		const updateData = {};
		if (startDate !== void 0) updateData.startDate = startDate;
		if (endDate !== void 0) updateData.endDate = endDate;
		if (monthlyRent !== void 0) updateData.monthlyRent = Number(monthlyRent);
		if (deposit !== void 0) updateData.deposit = Number(deposit);
		if (fileUrl !== void 0) updateData.fileUrl = fileUrl;
		if (notes !== void 0) updateData.notes = notes;
		if (status !== void 0) updateData.status = status;
		if (Object.keys(updateData).length === 0) return json({ error: "No fields to update" }, { status: 400 });
		return json((await db.update(contracts).set(updateData).where(eq(contracts.id, id)).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const id = url.searchParams.get("id");
		if (!id) return json({ error: "Missing contract ID" }, { status: 400 });
		if (!await landlordOwnsContract(auth.value, id)) return forbidden();
		await db.delete(contracts).where(eq(contracts.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-P1kl9h1n.js.map
