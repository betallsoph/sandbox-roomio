import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, q as messages, n as notificationQueue } from './db-B3IBLKz5.js';
import { b as landlordOwnsTenant, f as forbidden } from './authz-CdgY0Dc1.js';
import { d as deliverLandlordMessageToTelegram } from './message-delivery-Cu1-OKi7.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, asc, and, inArray } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/messages/+server.ts
function conversationId(landlordId, tenantId) {
	return `${landlordId}_${tenantId}`;
}
function sessionLandlordId(session) {
	if (session?.role === "LANDLORD") return session.landlordProfileId;
	if (session?.role === "STAFF") return session.staffLandlordId;
	return null;
}
async function authorizeConversation(session, landlordId, tenantId) {
	if (!session?.userId) return json({ error: "Vui lòng đăng nhập" }, { status: 401 });
	if (session.role === "TENANT" && tenantId !== session.tenantProfileId) return json({ error: "Không có quyền truy cập hội thoại này" }, { status: 403 });
	const landlordProfileId = sessionLandlordId(session);
	if (landlordProfileId && landlordId !== landlordProfileId) return json({ error: "Không có quyền truy cập hội thoại này" }, { status: 403 });
	if (session.role !== "TENANT" && !landlordProfileId) return json({ error: "Không có quyền truy cập hội thoại này" }, { status: 403 });
	if (!await landlordOwnsTenant(landlordId, tenantId)) return forbidden("Hội thoại không thuộc nhà trọ này");
	return null;
}
var GET = async ({ url, locals }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		const tenantId = url.searchParams.get("tenantId");
		if (!landlordId || !tenantId) return json({ error: "Missing landlordId or tenantId" }, { status: 400 });
		const authError = await authorizeConversation(locals.session, landlordId, tenantId);
		if (authError) return authError;
		const result = await db.select().from(messages).where(eq(messages.conversationId, conversationId(landlordId, tenantId))).orderBy(asc(messages.createdAt)).limit(500);
		const messageIds = result.map((message) => message.id);
		const deliveries = messageIds.length === 0 ? [] : await db.select({
			id: notificationQueue.id,
			relatedId: notificationQueue.relatedId,
			status: notificationQueue.status,
			attemptCount: notificationQueue.attemptCount,
			lastError: notificationQueue.lastError,
			sentAt: notificationQueue.sentAt
		}).from(notificationQueue).where(and(eq(notificationQueue.channel, "telegram"), eq(notificationQueue.relatedType, "message"), inArray(notificationQueue.relatedId, messageIds)));
		const deliveryByMessageId = new Map(deliveries.map((delivery) => [delivery.relatedId, delivery]));
		return json(result.map((message) => {
			const delivery = deliveryByMessageId.get(message.id);
			return {
				...message,
				telegramDelivery: delivery ? {
					notificationId: delivery.id,
					status: delivery.status,
					attemptCount: delivery.attemptCount,
					lastError: delivery.lastError,
					sentAt: delivery.sentAt
				} : null
			};
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const landlordId = typeof body.landlordId === "string" ? body.landlordId : "";
		const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
		const content = typeof body.content === "string" ? body.content.trim() : "";
		if (!landlordId || !tenantId || !content) return json({ error: "Thiếu thông tin tin nhắn" }, { status: 400 });
		const authError = await authorizeConversation(locals.session, landlordId, tenantId);
		if (authError) return authError;
		const created = await db.insert(messages).values({
			conversationId: conversationId(landlordId, tenantId),
			senderId: locals.session.userId,
			content
		}).returning();
		let telegramDelivery = null;
		if (locals.session?.role !== "TENANT") try {
			telegramDelivery = await deliverLandlordMessageToTelegram({
				landlordId,
				tenantId,
				messageId: created[0].id,
				content
			});
		} catch (deliveryError) {
			console.error("Telegram delivery failed after message was saved", deliveryError);
			telegramDelivery = {
				status: "failed",
				delivered: false,
				code: "delivery_error",
				message: "Tin đã lưu nhưng không ghi được trạng thái gửi Telegram",
				retryable: true
			};
		}
		return json({
			...created[0],
			telegramDelivery
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, POST };
//# sourceMappingURL=_server.ts-S-5UXM0d.js.map
