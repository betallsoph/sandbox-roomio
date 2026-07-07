import { d as db, p as properties, r as rooms, t as tenantProfiles, f as contracts, i as invoices } from './db-B3IBLKz5.js';
import { j as json } from './index-CLnuRv4X.js';
import { and, eq } from 'drizzle-orm';

//#region src/lib/server/authz.ts
function requireLandlord(session) {
	if (session?.role !== "LANDLORD" || !session.landlordProfileId) return {
		ok: false,
		response: json({ error: "Chỉ chủ trọ được thực hiện thao tác này" }, { status: 403 })
	};
	return {
		ok: true,
		value: session.landlordProfileId
	};
}
async function landlordOwnsProperty(landlordId, propertyId) {
	return !!await db.query.properties.findFirst({
		where: and(eq(properties.id, propertyId), eq(properties.landlordId, landlordId)),
		columns: { id: true }
	});
}
async function landlordOwnsRoom(landlordId, roomId) {
	return (await db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(rooms.id, roomId), eq(properties.landlordId, landlordId))).limit(1)).length > 0;
}
async function landlordOwnsTenant(landlordId, tenantId) {
	return (await db.select({ id: tenantProfiles.id }).from(tenantProfiles).innerJoin(rooms, eq(tenantProfiles.id, rooms.tenantId)).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(tenantProfiles.id, tenantId), eq(properties.landlordId, landlordId))).limit(1)).length > 0;
}
async function landlordOwnsInvoice(landlordId, invoiceId) {
	return (await db.select({ id: invoices.id }).from(invoices).innerJoin(rooms, eq(invoices.roomId, rooms.id)).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(invoices.id, invoiceId), eq(properties.landlordId, landlordId))).limit(1)).length > 0;
}
async function tenantOwnsInvoice(tenantId, invoiceId) {
	return (await db.select({ id: invoices.id }).from(invoices).innerJoin(rooms, eq(invoices.roomId, rooms.id)).where(and(eq(invoices.id, invoiceId), eq(rooms.tenantId, tenantId))).limit(1)).length > 0;
}
async function landlordOwnsContract(landlordId, contractId) {
	return (await db.select({ id: contracts.id }).from(contracts).innerJoin(rooms, eq(contracts.roomId, rooms.id)).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(contracts.id, contractId), eq(properties.landlordId, landlordId))).limit(1)).length > 0;
}
function forbidden(message = "Không có quyền truy cập dữ liệu này") {
	return json({ error: message }, { status: 403 });
}

export { landlordOwnsRoom as a, landlordOwnsTenant as b, landlordOwnsContract as c, landlordOwnsInvoice as d, forbidden as f, landlordOwnsProperty as l, requireLandlord as r, tenantOwnsInvoice as t };
//# sourceMappingURL=authz-CdgY0Dc1.js.map
