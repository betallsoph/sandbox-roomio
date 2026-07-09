import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, i as invoices, r as rooms, o as paymentTransactions } from './db-DPjKSjsC.js';
import { d as landlordOwnsInvoice, f as forbidden, t as tenantOwnsInvoice } from './authz-Cca2HujG.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, sql } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/invoices/[id]/+server.ts
var GET = async ({ params, locals }) => {
	try {
		const { id } = params;
		if (!id) return json({ error: "Missing invoice ID" }, { status: 400 });
		const invoice = await db.query.invoices.findFirst({
			where: eq(invoices.id, id),
			with: {
				items: true,
				room: { with: { property: { with: { landlord: true } } } }
			}
		});
		if (!invoice) return json({ error: "Invoice not found" }, { status: 404 });
		if (locals.session?.role === "LANDLORD" && invoice.room.property.landlord.id !== locals.session.landlordProfileId) return forbidden();
		if (locals.session?.role === "TENANT" && !await tenantOwnsInvoice(locals.session.tenantProfileId, id)) return forbidden();
		return json(invoice);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ params, request, locals }) => {
	try {
		const { id } = params;
		const { action, paymentProofImage, paidAmount } = await request.json();
		if (locals.session?.role === "TENANT" && action !== "uploadProof") return json({ error: "Khách thuê chỉ được gửi ảnh xác nhận chuyển khoản" }, { status: 403 });
		if (!id) return json({ error: "Missing invoice ID" }, { status: 400 });
		const invoice = await db.query.invoices.findFirst({
			where: eq(invoices.id, id),
			with: { room: true }
		});
		if (!invoice) return json({ error: "Invoice not found" }, { status: 404 });
		if (action === "uploadProof") {
			if (locals.session?.role === "TENANT" && !await tenantOwnsInvoice(locals.session.tenantProfileId, id)) return forbidden();
			if (locals.session?.role === "LANDLORD" && !await landlordOwnsInvoice(locals.session.landlordProfileId, id)) return forbidden();
		} else if (locals.session?.role !== "LANDLORD" || !await landlordOwnsInvoice(locals.session.landlordProfileId, id)) return forbidden("Chỉ chủ trọ sở hữu hóa đơn này được cập nhật thanh toán");
		if (action === "confirmPaid") {
			if (invoice.status === "paid") return json({ error: "Invoice is already paid" }, { status: 400 });
			return json(await db.transaction(async (tx) => {
				const outstandingAmount = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
				const inv = (await tx.update(invoices).set({
					status: "paid",
					paidAmount: invoice.totalAmount,
					paidDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
				}).where(eq(invoices.id, id)).returning())[0];
				await tx.insert(paymentTransactions).values({
					landlordId: locals.session.landlordProfileId,
					invoiceId: id,
					provider: "manual",
					providerTransactionId: `manual:${id}:${Date.now()}`,
					invoiceCode: id,
					amount: outstandingAmount,
					transferType: "manual",
					content: "Chủ trọ xác nhận đã nhận đủ tiền",
					status: "applied",
					rawPayload: JSON.stringify({
						action: "confirmPaid",
						invoiceId: id
					})
				});
				await tx.update(rooms).set({
					status: "paid",
					debtAmount: sql`coalesce(${rooms.debtAmount}, 0) - ${outstandingAmount}`
				}).where(eq(rooms.id, invoice.roomId));
				return inv;
			}));
		} else if (action === "uploadProof") {
			if (!paymentProofImage) return json({ error: "Missing payment proof image url" }, { status: 400 });
			return json((await db.update(invoices).set({
				paymentProofImage,
				status: "pending"
			}).where(eq(invoices.id, id)).returning())[0]);
		} else {
			const updateData = {};
			if (paidAmount !== void 0) {
				updateData.paidAmount = Number(paidAmount);
				if (Number(paidAmount) >= invoice.totalAmount) {
					updateData.status = "paid";
					updateData.paidDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
				}
			}
			if (Object.keys(updateData).length === 0) return json(invoice);
			return json((await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning())[0]);
		}
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ params, locals }) => {
	try {
		const { id } = params;
		if (!id) return json({ error: "Missing invoice ID" }, { status: 400 });
		const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
		if (!invoice) return json({ error: "Invoice not found" }, { status: 404 });
		if (locals.session?.role !== "LANDLORD" || !await landlordOwnsInvoice(locals.session.landlordProfileId, id)) return forbidden();
		await db.transaction(async (tx) => {
			await tx.delete(invoices).where(eq(invoices.id, id));
			if (invoice.status !== "paid") {
				const outstanding = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
				await tx.update(rooms).set({ debtAmount: sql`coalesce(${rooms.debtAmount}, 0) - ${outstanding}` }).where(eq(rooms.id, invoice.roomId));
			}
		});
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, PUT };
//# sourceMappingURL=_server.ts-DNjhJccm.js.map
