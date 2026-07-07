import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, i as invoices, l as landlordProfiles } from './db-B3IBLKz5.js';
import { t as tenantOwnsInvoice, f as forbidden, d as landlordOwnsInvoice } from './authz-CdgY0Dc1.js';
import { r as resolvePayOSConfig, m as makePayOSOrderCode, c as createPayOSPaymentLink } from './payos-DjyfWihO.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'crypto';
import './index-DBqjc0Yf.js';

//#region src/routes/api/invoices/[id]/payment-link/+server.ts
function paymentDescription(invoiceId) {
	return `RIO${invoiceId.replace(/[^A-Z0-9]/gi, "").slice(-9).toUpperCase()}`.slice(0, 25);
}
function buildVietQRImageUrl(opts) {
	return `${`https://img.vietqr.io/image/${encodeURIComponent(opts.bankCode)}-${encodeURIComponent(opts.accountNumber)}-compact2.png`}?${new URLSearchParams({
		amount: String(Math.round(opts.amount)),
		addInfo: opts.description,
		accountName: opts.accountName
	}).toString()}`;
}
var STALE_PAYOS_STATUSES = ["CANCELLED", "EXPIRED"];
var POST = async ({ params, locals }) => {
	try {
		const { id } = params;
		if (!id) return json({ error: "Missing invoice ID" }, { status: 400 });
		const invoice = await db.query.invoices.findFirst({
			where: eq(invoices.id, id),
			with: {
				items: true,
				room: { with: { property: { columns: { landlordId: true } } } }
			}
		});
		if (!invoice) return json({ error: "Invoice not found" }, { status: 404 });
		if (invoice.status === "paid") return json({ error: "Hóa đơn đã thanh toán" }, { status: 400 });
		if (locals.session?.role === "TENANT" && !await tenantOwnsInvoice(locals.session.tenantProfileId, id)) return forbidden();
		if (locals.session?.role === "LANDLORD" && !await landlordOwnsInvoice(locals.session.landlordProfileId, id)) return forbidden();
		if (locals.session?.role !== "TENANT" && locals.session?.role !== "LANDLORD") return forbidden();
		const landlordId = invoice.room.property.landlordId;
		const amountDue = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
		const description = paymentDescription(invoice.id);
		if (invoice.payosCheckoutUrl && invoice.payosPaymentLinkId && !STALE_PAYOS_STATUSES.includes(invoice.payosStatus ?? "")) return json({
			provider: "payos",
			orderCode: Number(invoice.payosOrderCode),
			paymentLinkId: invoice.payosPaymentLinkId,
			checkoutUrl: invoice.payosCheckoutUrl,
			qrCode: invoice.payosQrCode,
			status: invoice.payosStatus
		});
		const config = await resolvePayOSConfig({
			scope: "rent",
			landlordId
		});
		if (!config) {
			const profile = await db.query.landlordProfiles.findFirst({
				where: eq(landlordProfiles.id, landlordId),
				columns: {
					bankName: true,
					bankCode: true,
					accountNumber: true,
					accountName: true
				}
			});
			if (!profile?.accountNumber || !profile.bankCode) return json({ error: "Chủ trọ chưa cấu hình tài khoản nhận tiền" }, { status: 400 });
			return json({
				provider: "vietqr",
				bankName: profile.bankName,
				bankCode: profile.bankCode,
				accountNumber: profile.accountNumber,
				accountName: profile.accountName,
				amount: amountDue,
				description,
				qrImageUrl: buildVietQRImageUrl({
					bankCode: profile.bankCode,
					accountNumber: profile.accountNumber,
					accountName: profile.accountName,
					amount: amountDue,
					description
				})
			});
		}
		const stale = STALE_PAYOS_STATUSES.includes(invoice.payosStatus ?? "");
		const orderCode = invoice.payosOrderCode && !stale ? Number(invoice.payosOrderCode) : makePayOSOrderCode(stale ? `${invoice.id}:${Date.now()}` : invoice.id);
		const paymentLink = await createPayOSPaymentLink(config, {
			invoiceId: invoice.id,
			orderCode,
			amount: amountDue,
			description,
			buyerName: invoice.tenantName,
			buyerPhone: invoice.tenantPhone,
			items: invoice.items.length > 0 ? invoice.items.map((item) => ({
				name: item.name,
				quantity: 1,
				price: item.amount
			})) : [{
				name: `Hoa don ${invoice.id}`,
				quantity: 1,
				price: invoice.totalAmount
			}]
		});
		await db.update(invoices).set({
			paymentProvider: "payos",
			payosOrderCode: String(paymentLink.orderCode),
			payosPaymentLinkId: paymentLink.paymentLinkId,
			payosCheckoutUrl: paymentLink.checkoutUrl,
			payosQrCode: paymentLink.qrCode,
			payosStatus: paymentLink.status
		}).where(eq(invoices.id, invoice.id));
		return json({
			provider: "payos",
			orderCode: paymentLink.orderCode,
			paymentLinkId: paymentLink.paymentLinkId,
			checkoutUrl: paymentLink.checkoutUrl,
			qrCode: paymentLink.qrCode,
			status: paymentLink.status
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts-KTgaZgL_.js.map
