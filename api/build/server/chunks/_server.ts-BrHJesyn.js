import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, i as invoices, r as rooms, p as properties, k as invoiceItems } from './db-DPjKSjsC.js';
import { r as requireLandlord, f as forbidden, a as landlordOwnsRoom } from './authz-Cca2HujG.js';
import { j as json } from './index-CLnuRv4X.js';
import { inArray, eq, sql, desc, and } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/invoices/+server.ts
var GET = async ({ url, locals }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		const tenantId = url.searchParams.get("tenantId");
		const roomId = url.searchParams.get("roomId");
		const status = url.searchParams.get("status");
		const conditions = [];
		if (locals.session?.role === "LANDLORD") conditions.push(inArray(invoices.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, locals.session.landlordProfileId))));
		else if (locals.session?.role === "TENANT") {
			if (!locals.session.tenantProfileId) return forbidden();
			conditions.push(inArray(invoices.roomId, db.select({ id: rooms.id }).from(rooms).where(eq(rooms.tenantId, locals.session.tenantProfileId))));
		} else if (landlordId) conditions.push(inArray(invoices.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId))));
		else if (tenantId) conditions.push(inArray(invoices.roomId, db.select({ id: rooms.id }).from(rooms).where(eq(rooms.tenantId, tenantId))));
		else if (roomId) conditions.push(eq(invoices.roomId, roomId));
		if (status) conditions.push(eq(invoices.status, status));
		return json(await db.query.invoices.findMany({
			where: conditions.length > 0 ? and(...conditions) : void 0,
			with: {
				items: true,
				room: { with: {
					property: true,
					block: true
				} }
			},
			orderBy: [desc(invoices.month), desc(invoices.createdAt)]
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const { roomId, month, rentAmount, dueDate, items, notes } = await request.json();
		if (!roomId || !month || rentAmount === void 0 || !dueDate || !items || !Array.isArray(items)) return json({ error: "Missing required invoice parameters" }, { status: 400 });
		if (!await landlordOwnsRoom(auth.value, roomId)) return forbidden();
		if (await db.query.invoices.findFirst({
			where: and(eq(invoices.roomId, roomId), eq(invoices.month, month)),
			columns: { id: true }
		})) return json({ error: "Phòng này đã có hóa đơn cho tháng đã chọn" }, { status: 409 });
		const room = await db.query.rooms.findFirst({
			where: eq(rooms.id, roomId),
			with: { tenant: { with: { user: true } } }
		});
		if (!room) return json({ error: "Room not found" }, { status: 404 });
		if (!room.tenant) return json({ error: "Room has no active tenant" }, { status: 400 });
		const tenantName = room.tenant.user.name;
		const tenantPhone = room.tenant.user.phone;
		const invoiceItemList = items;
		const totalAmount = invoiceItemList.reduce((sum, item) => sum + Number(item.amount), 0);
		const randomHex = Math.floor(1e3 + Math.random() * 9e3).toString();
		const invoiceId = `INV-${month.replace("-", "")}-${randomHex}`;
		const invoice = await db.transaction(async (tx) => {
			const inv = (await tx.insert(invoices).values({
				id: invoiceId,
				roomId,
				roomNumber: room.roomNumber,
				tenantName,
				tenantPhone,
				month,
				rentAmount: Number(rentAmount),
				totalAmount,
				dueDate,
				status: "pending",
				paidAmount: 0,
				createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
				notes
			}).returning())[0];
			await tx.insert(invoiceItems).values(invoiceItemList.map((item) => ({
				invoiceId: inv.id,
				name: item.name,
				amount: Number(item.amount),
				details: item.details
			})));
			await tx.update(rooms).set({
				status: "debt",
				debtAmount: sql`coalesce(${rooms.debtAmount}, 0) + ${totalAmount}`
			}).where(eq(rooms.id, roomId));
			return inv;
		});
		return json(await db.query.invoices.findFirst({
			where: eq(invoices.id, invoice.id),
			with: { items: true }
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const body = await request.json();
		const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];
		if (ids.length === 0) return json({ error: "Chưa chọn hóa đơn để xóa" }, { status: 400 });
		const ownedInvoices = await db.query.invoices.findMany({
			where: inArray(invoices.id, ids),
			with: { room: { with: { property: { columns: { landlordId: true } } } } }
		});
		if (ownedInvoices.length !== ids.length) return json({ error: "Một số hóa đơn không tồn tại" }, { status: 404 });
		if (ownedInvoices.some((invoice) => invoice.room.property.landlordId !== auth.value)) return forbidden();
		await db.transaction(async (tx) => {
			for (const invoice of ownedInvoices) {
				await tx.delete(invoices).where(eq(invoices.id, invoice.id));
				if (invoice.status !== "paid") {
					const outstanding = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
					await tx.update(rooms).set({ debtAmount: sql`greatest(coalesce(${rooms.debtAmount}, 0) - ${outstanding}, 0)` }).where(eq(rooms.id, invoice.roomId));
				}
			}
		});
		return json({
			success: true,
			count: ownedInvoices.length
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST };
//# sourceMappingURL=_server.ts-BrHJesyn.js.map
