import { e as errorMessage } from './api-BHH2biX8.js';
import { i as invoices, d as db, o as paymentTransactions, r as rooms } from './db-B3IBLKz5.js';
import { r as resolvePayOSConfig, v as verifyPayOSWebhook } from './payos-DjyfWihO.js';
import { j as json } from './index-CLnuRv4X.js';
import { or, eq, sql } from 'drizzle-orm';

//#region src/routes/api/payment-webhook/+server.ts
var POST = async ({ request }) => {
	try {
		const body = await request.json();
		const { code, desc, success, data, signature } = body;
		if (!data || typeof data !== "object" || !signature) return json({ error: "Payload PayOS không hợp lệ" }, { status: 400 });
		const orderCode = data.orderCode !== void 0 ? String(data.orderCode) : null;
		const paymentLinkId = data.paymentLinkId ? String(data.paymentLinkId) : null;
		const amount = Number(data.amount) || 0;
		const providerTransactionId = String(data.reference ?? `${orderCode ?? "unknown"}:${paymentLinkId ?? "unknown"}:${data.transactionDateTime ?? ""}:${amount}`);
		const rawPayload = JSON.stringify(body);
		const matchCondition = orderCode && paymentLinkId ? or(eq(invoices.payosOrderCode, orderCode), eq(invoices.payosPaymentLinkId, paymentLinkId)) : orderCode ? eq(invoices.payosOrderCode, orderCode) : paymentLinkId ? eq(invoices.payosPaymentLinkId, paymentLinkId) : void 0;
		const invoice = matchCondition ? await db.query.invoices.findFirst({
			where: matchCondition,
			with: { room: { with: { property: { columns: { landlordId: true } } } } }
		}) : null;
		if (!invoice) {
			await db.insert(paymentTransactions).values({
				provider: "payos",
				providerTransactionId,
				invoiceCode: orderCode,
				amount,
				transferType: "webhook",
				content: data.description ?? "PayOS webhook không khớp hóa đơn",
				status: "unmatched",
				rawPayload
			});
			return json({
				success: true,
				message: "Không tìm thấy hóa đơn khớp PayOS"
			});
		}
		const landlordId = invoice.room.property.landlordId;
		const config = await resolvePayOSConfig({
			scope: "rent",
			landlordId
		});
		if (!config) return json({ error: "Chủ trọ chưa kết nối PayOS để nhận webhook" }, { status: 400 });
		if (!verifyPayOSWebhook(data, String(signature), config.checksumKey)) return json({ error: "Sai chữ ký PayOS" }, { status: 401 });
		if (await db.query.paymentTransactions.findFirst({
			where: eq(paymentTransactions.providerTransactionId, providerTransactionId),
			columns: { id: true }
		})) return json({
			success: true,
			message: "Giao dịch PayOS đã được xử lý trước đó"
		});
		if (!success || code !== "00" || data.code !== "00") {
			await db.insert(paymentTransactions).values({
				landlordId,
				invoiceId: invoice.id,
				provider: "payos",
				providerTransactionId,
				invoiceCode: orderCode,
				amount,
				transferType: "webhook",
				content: desc ?? data.desc ?? "PayOS webhook không thành công",
				status: "ignored",
				rawPayload
			});
			return json({
				success: true,
				message: "Bỏ qua webhook PayOS không thành công"
			});
		}
		if (invoice.status === "paid") {
			await db.insert(paymentTransactions).values({
				landlordId,
				invoiceId: invoice.id,
				provider: "payos",
				providerTransactionId,
				invoiceCode: orderCode,
				amount,
				transferType: "webhook",
				content: data.description ?? null,
				status: "duplicate",
				rawPayload
			});
			return json({
				success: true,
				message: "Hóa đơn đã được thanh toán trước đó"
			});
		}
		const newPaidAmount = invoice.paidAmount + amount;
		const fullyPaid = newPaidAmount >= invoice.totalAmount;
		const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		await db.transaction(async (tx) => {
			await tx.insert(paymentTransactions).values({
				landlordId,
				invoiceId: invoice.id,
				provider: "payos",
				providerTransactionId,
				invoiceCode: orderCode,
				amount,
				transferType: "webhook",
				content: data.description ?? null,
				status: "applied",
				rawPayload
			});
			await tx.update(invoices).set({
				paidAmount: newPaidAmount,
				status: fullyPaid ? "paid" : "partial",
				paidDate: fullyPaid ? today : null,
				paymentMethod: "payos_webhook",
				paymentProvider: "payos",
				payosOrderCode: orderCode,
				payosPaymentLinkId: paymentLinkId,
				payosStatus: fullyPaid ? "PAID" : "PARTIAL"
			}).where(eq(invoices.id, invoice.id));
			await tx.update(rooms).set({
				debtAmount: sql`greatest(coalesce(${rooms.debtAmount}, 0) - ${amount}, 0)`,
				...fullyPaid ? { status: "paid" } : {}
			}).where(eq(rooms.id, invoice.roomId));
		});
		return json({
			success: true,
			invoiceId: invoice.id,
			status: fullyPaid ? "paid" : "partial"
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { POST as P };
//# sourceMappingURL=_server-DG7uHcj2.js.map
