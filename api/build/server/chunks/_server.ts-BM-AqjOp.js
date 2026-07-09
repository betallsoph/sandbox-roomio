import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, c as services, r as rooms, p as properties, w as roomServiceConfigs } from './db-DPjKSjsC.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, asc } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/services/+server.ts
var SERVICE_TYPES = [
	"METERED",
	"MANUAL_AMOUNT",
	"FLAT_ROOM",
	"FLAT_PERSON",
	"FLAT_VEHICLE"
];
var GET = async ({ url }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		if (!landlordId) return json({ error: "Missing landlord ID" }, { status: 400 });
		return json(await db.select().from(services).where(eq(services.landlordId, landlordId)).orderBy(asc(services.name)));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const landlordId = locals.session?.landlordProfileId;
		if (locals.session?.role !== "LANDLORD" || !landlordId) return json({ error: "Chỉ chủ trọ được quản lý dịch vụ" }, { status: 403 });
		const { name, type, defaultRate, isActive } = await request.json();
		if (!name || !type || defaultRate === void 0) return json({ error: "Missing required service fields" }, { status: 400 });
		if (!SERVICE_TYPES.includes(type)) return json({ error: "Cách tính dịch vụ không hợp lệ" }, { status: 400 });
		return json(await db.transaction(async (tx) => {
			const created = (await tx.insert(services).values({
				landlordId,
				name,
				type,
				defaultRate: Number(defaultRate),
				isActive: isActive !== void 0 ? isActive : true
			}).returning())[0];
			const landlordRooms = await tx.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId));
			if (landlordRooms.length > 0) await tx.insert(roomServiceConfigs).values(landlordRooms.map((room) => ({
				roomId: room.id,
				serviceId: created.id,
				customRate: null,
				quantity: 1
			})));
			return created;
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const { id, name, defaultRate, isActive } = await request.json();
		if (!id) return json({ error: "Missing service ID" }, { status: 400 });
		const existing = await db.query.services.findFirst({ where: eq(services.id, id) });
		if (!existing) return json({ error: "Không tìm thấy dịch vụ" }, { status: 404 });
		if (locals.session?.role !== "LANDLORD" || existing.landlordId !== locals.session.landlordProfileId) return json({ error: "Không có quyền sửa dịch vụ này" }, { status: 403 });
		const updateData = {};
		if (name !== void 0) updateData.name = name;
		if (defaultRate !== void 0) updateData.defaultRate = Number(defaultRate);
		if (isActive !== void 0) updateData.isActive = isActive;
		if (Object.keys(updateData).length === 0) return json({ error: "No fields to update" }, { status: 400 });
		return json((await db.update(services).set(updateData).where(eq(services.id, id)).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const id = url.searchParams.get("id");
		if (!id) return json({ error: "Missing service ID" }, { status: 400 });
		const existing = await db.query.services.findFirst({ where: eq(services.id, id) });
		if (!existing) return json({ error: "Không tìm thấy dịch vụ" }, { status: 404 });
		if (locals.session?.role !== "LANDLORD" || existing.landlordId !== locals.session.landlordProfileId) return json({ error: "Không có quyền xóa dịch vụ này" }, { status: 403 });
		await db.delete(services).where(eq(services.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-BM-AqjOp.js.map
