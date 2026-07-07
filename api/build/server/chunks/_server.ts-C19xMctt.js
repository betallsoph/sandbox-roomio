import { e as errorMessage } from './api-BHH2biX8.js';
import { v as specialNotes, d as db, r as rooms, p as properties } from './db-B3IBLKz5.js';
import { f as forbidden, b as landlordOwnsTenant } from './authz-CdgY0Dc1.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, inArray, and, isNotNull, desc } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/notifications/+server.ts
var GET = async ({ url, locals }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		const tenantId = url.searchParams.get("tenantId");
		const conditions = [];
		if (locals.session?.role === "TENANT") {
			if (!locals.session.tenantProfileId) return forbidden();
			if (tenantId && tenantId !== locals.session.tenantProfileId) return forbidden();
			conditions.push(eq(specialNotes.tenantId, locals.session.tenantProfileId));
		} else if (locals.session?.role === "LANDLORD") {
			if (!locals.session.landlordProfileId) return forbidden();
			if (landlordId && landlordId !== locals.session.landlordProfileId) return forbidden();
			conditions.push(inArray(specialNotes.tenantId, db.select({ id: rooms.tenantId }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(properties.landlordId, locals.session.landlordProfileId), isNotNull(rooms.tenantId)))));
		} else if (landlordId) conditions.push(inArray(specialNotes.tenantId, db.select({ id: rooms.tenantId }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(properties.landlordId, landlordId), isNotNull(rooms.tenantId)))));
		else if (tenantId) conditions.push(eq(specialNotes.tenantId, tenantId));
		if (conditions.length === 0) return json({ error: "Missing landlordId or tenantId" }, { status: 400 });
		return json(await db.query.specialNotes.findMany({
			where: and(...conditions),
			with: { tenant: { with: {
				user: { columns: {
					name: true,
					phone: true
				} },
				rooms: { columns: { roomNumber: true } }
			} } },
			orderBy: desc(specialNotes.createdAt)
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const { tenantId, content, sender } = await request.json();
		const effectiveTenantId = locals.session?.role === "TENANT" ? locals.session.tenantProfileId : tenantId;
		if (!effectiveTenantId || !content) return json({ error: "Missing tenant ID or content" }, { status: 400 });
		if (locals.session?.role === "TENANT" && tenantId && tenantId !== locals.session.tenantProfileId) return forbidden();
		if (locals.session?.role === "LANDLORD" && !await landlordOwnsTenant(locals.session.landlordProfileId, effectiveTenantId)) return forbidden();
		if (locals.session?.role !== "TENANT" && locals.session?.role !== "LANDLORD") return forbidden();
		return json((await db.insert(specialNotes).values({
			tenantId: effectiveTenantId,
			content,
			sender: locals.session?.role === "LANDLORD" && sender === "LANDLORD" ? "LANDLORD" : "TENANT",
			isRead: false
		}).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const { id, isRead } = await request.json();
		if (!id) return json({ error: "Missing notification/note ID" }, { status: 400 });
		const note = await db.query.specialNotes.findFirst({
			where: eq(specialNotes.id, id),
			columns: { tenantId: true }
		});
		if (!note) return json({ error: "Không tìm thấy lời nhắn" }, { status: 404 });
		if (locals.session?.role === "TENANT" && note.tenantId !== locals.session.tenantProfileId) return forbidden();
		if (locals.session?.role === "LANDLORD" && !await landlordOwnsTenant(locals.session.landlordProfileId, note.tenantId)) return forbidden();
		if (locals.session?.role !== "TENANT" && locals.session?.role !== "LANDLORD") return forbidden();
		return json((await db.update(specialNotes).set({ isRead: isRead !== void 0 ? isRead : true }).where(eq(specialNotes.id, id)).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, POST, PUT };
//# sourceMappingURL=_server.ts-C19xMctt.js.map
