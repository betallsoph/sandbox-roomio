import { d as db, n as notificationQueue, t as tenantProfiles, p as properties, r as rooms } from './db-B3IBLKz5.js';
import { eq, desc, and, inArray, asc } from 'drizzle-orm';

//#region src/lib/server/telegram-bot.ts
var BOT_TOKEN = process.env.BOT_TOKEN?.trim() ?? "";
var BOT_USERNAME = process.env.BOT_USERNAME?.trim() ?? "";
var MINIAPP_SHORT_NAME = process.env.MINIAPP_SHORT_NAME?.trim() ?? "";
var TELEGRAM_SEND_TIMEOUT_MS = 8e3;
var TELEGRAM_MESSAGE_LIMIT = 4096;
function trimTelegramText(text) {
	if (text.length <= TELEGRAM_MESSAGE_LIMIT) return text;
	return `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - 24).trimEnd()}\n...(tin nhắn đã rút gọn)`;
}
function buildMiniAppUrl() {
	if (!BOT_USERNAME || !MINIAPP_SHORT_NAME) return null;
	return `https://t.me/${BOT_USERNAME}/${MINIAPP_SHORT_NAME}`;
}
function buildTenantDirectMessageText(content) {
	const miniAppUrl = buildMiniAppUrl();
	const parts = [
		"Bạn có tin nhắn mới từ chủ trọ",
		"",
		content.trim()
	];
	if (miniAppUrl) parts.push("", `Mở Roomio để trả lời: ${miniAppUrl}`);
	return trimTelegramText(parts.join("\n"));
}
function buildTenantAnnouncementText(title, content) {
	const miniAppUrl = buildMiniAppUrl();
	const parts = [
		"Thông báo từ chủ trọ",
		"",
		title.trim(),
		"",
		content.trim()
	];
	if (miniAppUrl) parts.push("", `Mở Roomio để xem chi tiết: ${miniAppUrl}`);
	return trimTelegramText(parts.join("\n"));
}
async function sendTelegramMessage(chatId, text) {
	if (!BOT_TOKEN) return {
		ok: false,
		code: "not_configured",
		message: "Server chưa cấu hình BOT_TOKEN",
		retryable: false
	};
	if (!chatId.trim()) return {
		ok: false,
		code: "bad_request",
		message: "Thiếu Telegram chat ID",
		retryable: false
	};
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TELEGRAM_SEND_TIMEOUT_MS);
	try {
		const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text: trimTelegramText(text)
			}),
			signal: controller.signal
		});
		const payload = await res.json().catch(() => null);
		if (res.ok && payload?.ok) return {
			ok: true,
			telegramMessageId: payload.result?.message_id ?? null
		};
		const description = payload?.description || `Telegram trả về HTTP ${res.status}`;
		if (res.status === 403) return {
			ok: false,
			code: "forbidden",
			message: description,
			retryable: false,
			status: res.status
		};
		if (res.status === 429) return {
			ok: false,
			code: "rate_limited",
			message: description,
			retryable: true,
			status: res.status,
			retryAfterSeconds: payload?.parameters?.retry_after
		};
		if (res.status >= 500) return {
			ok: false,
			code: "network",
			message: description,
			retryable: true,
			status: res.status
		};
		return {
			ok: false,
			code: "bad_request",
			message: description,
			retryable: false,
			status: res.status
		};
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") return {
			ok: false,
			code: "timeout",
			message: "Gửi Telegram quá thời gian chờ",
			retryable: true
		};
		return {
			ok: false,
			code: "network",
			message: error instanceof Error ? error.message : "Không gọi được Telegram Bot API",
			retryable: true
		};
	} finally {
		clearTimeout(timeout);
	}
}
//#endregion
//#region src/lib/server/message-delivery.ts
var MAX_MANUAL_RETRY_BATCH = 25;
function today() {
	return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function nextAttemptAt(result) {
	if (!result.retryable) return null;
	const delaySeconds = result.retryAfterSeconds ?? 60;
	return new Date(Date.now() + delaySeconds * 1e3);
}
async function deliverLandlordMessageToTelegram(args) {
	const tenant = await db.query.tenantProfiles.findFirst({
		where: eq(tenantProfiles.id, args.tenantId),
		columns: {
			id: true,
			userId: true,
			telegramUserId: true
		}
	});
	if (!tenant) return {
		status: "skipped",
		delivered: false,
		code: "tenant_missing",
		message: "Không tìm thấy hồ sơ khách thuê"
	};
	if (!tenant.telegramUserId) return {
		status: "skipped",
		delivered: false,
		code: "tenant_not_linked",
		message: "Khách chưa liên kết Telegram"
	};
	const [queued] = await db.insert(notificationQueue).values({
		landlordId: args.landlordId,
		tenantId: tenant.id,
		recipientUserId: tenant.userId,
		type: "direct_message",
		channel: "telegram",
		title: "Tin nhắn mới từ chủ trọ",
		content: args.content,
		status: "queued",
		attemptCount: 0,
		relatedType: "message",
		relatedId: args.messageId,
		scheduledFor: today()
	}).returning();
	queueTelegramNotificationSend(queued);
	return {
		status: "queued",
		delivered: false,
		notificationId: queued.id,
		message: "Tin đã xếp hàng gửi Telegram"
	};
}
function buildTelegramText(notification) {
	if (notification.type === "direct_message") return buildTenantDirectMessageText(notification.content);
	if (notification.type === "announcement") return buildTenantAnnouncementText(notification.title, notification.content);
	return buildTenantDirectMessageText(notification.content);
}
function uniqueRecipients(rows) {
	const seen = /* @__PURE__ */ new Set();
	const recipients = [];
	for (const row of rows) {
		if (seen.has(row.tenantId)) continue;
		seen.add(row.tenantId);
		recipients.push(row);
	}
	return recipients;
}
async function findAnnouncementRecipients(landlordId, targetType, targetId) {
	const conditions = [eq(properties.landlordId, landlordId)];
	if (targetType === "PROPERTY" && targetId) conditions.push(eq(rooms.propertyId, targetId));
	if (targetType === "BLOCK" && targetId) conditions.push(eq(rooms.blockId, targetId));
	if (targetType === "ROOM" && targetId) conditions.push(eq(rooms.id, targetId));
	if (targetType === "TENANT" && targetId) conditions.push(eq(tenantProfiles.id, targetId));
	return uniqueRecipients(await db.select({
		tenantId: tenantProfiles.id,
		userId: tenantProfiles.userId,
		telegramUserId: tenantProfiles.telegramUserId
	}).from(tenantProfiles).innerJoin(rooms, eq(tenantProfiles.id, rooms.tenantId)).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(...conditions)));
}
async function queueAnnouncementTelegramDeliveries(args) {
	const targetType = [
		"ALL",
		"PROPERTY",
		"BLOCK",
		"ROOM",
		"TENANT"
	].includes(args.targetType) ? args.targetType : "ALL";
	const recipients = await findAnnouncementRecipients(args.landlordId, targetType, args.targetId);
	const linkedRecipients = recipients.filter((recipient) => recipient.telegramUserId);
	if (linkedRecipients.length === 0) return {
		status: "queued",
		totalRecipients: recipients.length,
		queued: 0,
		skippedUnlinked: recipients.length
	};
	const deliveryTitle = args.isImportant ? `Thông báo quan trọng: ${args.title}` : args.title;
	const queued = await db.insert(notificationQueue).values(linkedRecipients.map((recipient) => ({
		landlordId: args.landlordId,
		tenantId: recipient.tenantId,
		recipientUserId: recipient.userId,
		type: "announcement",
		channel: "telegram",
		title: deliveryTitle,
		content: args.content,
		status: "queued",
		attemptCount: 0,
		relatedType: "announcement",
		relatedId: args.announcementId,
		scheduledFor: today()
	}))).returning();
	for (const row of queued) queueTelegramNotificationSend(row);
	return {
		status: "queued",
		totalRecipients: recipients.length,
		queued: queued.length,
		skippedUnlinked: recipients.length - queued.length
	};
}
async function markTelegramDeliveryFailed(notification, result) {
	const attemptCount = notification.attemptCount + 1;
	await db.update(notificationQueue).set({
		status: "failed",
		attemptCount,
		lastError: result.message,
		nextAttemptAt: nextAttemptAt(result)
	}).where(eq(notificationQueue.id, notification.id));
	return {
		status: "failed",
		delivered: false,
		notificationId: notification.id,
		code: result.code,
		message: result.message,
		retryable: result.retryable
	};
}
function queueTelegramNotificationSend(notification) {
	sendQueuedTelegramNotification(notification).catch(async (error) => {
		console.error("Queued Telegram delivery crashed", error);
		await markTelegramDeliveryFailed(notification, {
			code: "network",
			message: error instanceof Error ? error.message : "Không chạy được delivery Telegram",
			retryable: true
		}).catch((markError) => {
			console.error("Failed to mark queued Telegram delivery as failed", markError);
		});
	});
}
async function sendQueuedTelegramNotification(notification) {
	if (notification.channel !== "telegram") return {
		status: "failed",
		delivered: false,
		notificationId: notification.id,
		code: "delivery_error",
		message: "Delivery này không phải kênh Telegram",
		retryable: false
	};
	if (notification.status === "sent") return {
		status: "sent",
		delivered: true,
		notificationId: notification.id,
		telegramMessageId: notification.providerMessageId ? Number(notification.providerMessageId) : null
	};
	if (!notification.tenantId) return markTelegramDeliveryFailed(notification, {
		code: "bad_request",
		message: "Delivery thiếu tenantId",
		retryable: false
	});
	const tenant = await db.query.tenantProfiles.findFirst({
		where: eq(tenantProfiles.id, notification.tenantId),
		columns: { telegramUserId: true }
	});
	if (!tenant?.telegramUserId) return markTelegramDeliveryFailed(notification, {
		code: "bad_request",
		message: "Khách chưa liên kết Telegram",
		retryable: false
	});
	const result = await sendTelegramMessage(tenant.telegramUserId, buildTelegramText(notification));
	if (result.ok) {
		await db.update(notificationQueue).set({
			status: "sent",
			attemptCount: notification.attemptCount + 1,
			lastError: null,
			providerMessageId: result.telegramMessageId === null ? null : String(result.telegramMessageId),
			nextAttemptAt: null,
			sentAt: /* @__PURE__ */ new Date()
		}).where(eq(notificationQueue.id, notification.id));
		return {
			status: "sent",
			delivered: true,
			notificationId: notification.id,
			telegramMessageId: result.telegramMessageId
		};
	}
	return markTelegramDeliveryFailed(notification, result);
}
async function listTelegramDeliveries(landlordId, limit = 20) {
	return db.query.notificationQueue.findMany({
		where: and(eq(notificationQueue.landlordId, landlordId), eq(notificationQueue.channel, "telegram"), inArray(notificationQueue.status, ["queued", "failed"])),
		with: { tenant: { with: {
			user: { columns: {
				name: true,
				phone: true
			} },
			rooms: { columns: { roomNumber: true } }
		} } },
		orderBy: [desc(notificationQueue.createdAt)],
		limit
	});
}
async function retryTelegramDelivery(landlordId, notificationId) {
	const notification = await db.query.notificationQueue.findFirst({ where: and(eq(notificationQueue.id, notificationId), eq(notificationQueue.landlordId, landlordId), eq(notificationQueue.channel, "telegram")) });
	if (!notification) return null;
	return sendQueuedTelegramNotification(notification);
}
async function retryPendingTelegramDeliveries(landlordId, limit = 10) {
	const cappedLimit = Math.min(Math.max(limit, 1), MAX_MANUAL_RETRY_BATCH);
	const rows = await db.query.notificationQueue.findMany({
		where: and(eq(notificationQueue.landlordId, landlordId), eq(notificationQueue.channel, "telegram"), inArray(notificationQueue.status, ["queued", "failed"])),
		orderBy: [asc(notificationQueue.createdAt)],
		limit: cappedLimit
	});
	const results = [];
	for (const row of rows) results.push({
		id: row.id,
		result: await sendQueuedTelegramNotification(row)
	});
	return results;
}

export { retryTelegramDelivery as a, deliverLandlordMessageToTelegram as d, listTelegramDeliveries as l, queueAnnouncementTelegramDeliveries as q, retryPendingTelegramDeliveries as r };
//# sourceMappingURL=message-delivery-Cu1-OKi7.js.map
