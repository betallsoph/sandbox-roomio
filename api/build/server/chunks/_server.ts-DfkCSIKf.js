import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, j as maintenanceRequests, r as rooms, p as properties } from './db-DPjKSjsC.js';
import { f as forbidden, b as landlordOwnsTenant } from './authz-Cca2HujG.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, inArray, and, isNotNull, desc } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/requests/+server.ts
async function landlordOwnsRequest(landlordId, requestId) {
	return (await db.select({ id: maintenanceRequests.id }).from(maintenanceRequests).innerJoin(rooms, eq(maintenanceRequests.tenantId, rooms.tenantId)).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(maintenanceRequests.id, requestId), eq(properties.landlordId, landlordId))).limit(1)).length > 0;
}
var GET = async ({ url, locals }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		const tenantId = url.searchParams.get("tenantId");
		const staffId = url.searchParams.get("staffId");
		const conditions = [];
		if (locals.session?.role === "TENANT") {
			if (!locals.session.tenantProfileId) return forbidden();
			if (tenantId && tenantId !== locals.session.tenantProfileId) return forbidden();
			conditions.push(eq(maintenanceRequests.tenantId, locals.session.tenantProfileId));
		} else if (locals.session?.role === "LANDLORD") {
			if (!locals.session.landlordProfileId) return forbidden();
			if (landlordId && landlordId !== locals.session.landlordProfileId) return forbidden();
			conditions.push(inArray(maintenanceRequests.tenantId, db.select({ id: rooms.tenantId }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(properties.landlordId, locals.session.landlordProfileId), isNotNull(rooms.tenantId)))));
		} else if (locals.session?.role === "STAFF") {
			if (!locals.session.staffProfileId) return forbidden();
			if (staffId && staffId !== locals.session.staffProfileId) return forbidden();
			conditions.push(eq(maintenanceRequests.assignedToId, locals.session.staffProfileId));
		} else if (landlordId) conditions.push(inArray(maintenanceRequests.tenantId, db.select({ id: rooms.tenantId }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(properties.landlordId, landlordId), isNotNull(rooms.tenantId)))));
		else if (tenantId) conditions.push(eq(maintenanceRequests.tenantId, tenantId));
		if (staffId && locals.session?.role !== "STAFF") conditions.push(eq(maintenanceRequests.assignedToId, staffId));
		if (conditions.length === 0) return json({ error: "Missing landlordId or tenantId" }, { status: 400 });
		return json(await db.query.maintenanceRequests.findMany({
			where: and(...conditions),
			with: {
				tenant: { with: { user: { columns: {
					name: true,
					phone: true
				} } } },
				assignedTo: { with: { user: { columns: {
					name: true,
					phone: true
				} } } }
			},
			orderBy: desc(maintenanceRequests.createdAt)
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const { tenantId, roomNumber, buildingName, category, title, description, imageUrl, priority } = await request.json();
		const effectiveTenantId = locals.session?.role === "TENANT" ? locals.session.tenantProfileId : tenantId;
		if (!effectiveTenantId || !roomNumber || !buildingName || !category || !title || !description) return json({ error: "Missing required maintenance request fields" }, { status: 400 });
		if (locals.session?.role === "TENANT" && tenantId && tenantId !== locals.session.tenantProfileId) return forbidden();
		if (locals.session?.role === "LANDLORD" && !await landlordOwnsTenant(locals.session.landlordProfileId, effectiveTenantId)) return forbidden();
		return json((await db.insert(maintenanceRequests).values({
			tenantId: effectiveTenantId,
			roomNumber,
			buildingName,
			category,
			title,
			description,
			imageUrl,
			priority: priority || "normal",
			status: "pending"
		}).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const { id, status, response, assignedToId } = await request.json();
		if (!id) return json({ error: "Missing maintenance request ID" }, { status: 400 });
		if (locals.session?.role === "STAFF") {
			const existing = await db.query.maintenanceRequests.findFirst({ where: eq(maintenanceRequests.id, id) });
			if (!existing || existing.assignedToId !== locals.session.staffProfileId) return json({ error: "Bạn chỉ được cập nhật sự cố được giao cho mình" }, { status: 403 });
		}
		if (locals.session?.role === "LANDLORD" && !await landlordOwnsRequest(locals.session.landlordProfileId, id)) return forbidden();
		const updateData = {};
		if (status !== void 0) updateData.status = status;
		if (response !== void 0) updateData.response = response;
		if (assignedToId !== void 0 && locals.session?.role !== "STAFF") updateData.assignedToId = assignedToId;
		if (Object.keys(updateData).length === 0) return json({ error: "No fields to update" }, { status: 400 });
		return json((await db.update(maintenanceRequests).set(updateData).where(eq(maintenanceRequests.id, id)).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const id = url.searchParams.get("id");
		if (!id) return json({ error: "Missing maintenance request ID" }, { status: 400 });
		if (locals.session?.role !== "LANDLORD" || !await landlordOwnsRequest(locals.session.landlordProfileId, id)) return forbidden();
		await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-DfkCSIKf.js.map
