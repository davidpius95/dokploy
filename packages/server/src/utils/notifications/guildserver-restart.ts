import { BRAND_NAME } from "@guildserver/server/constants";
import { db } from "@guildserver/server/db";
import { notifications } from "@guildserver/server/db/schema";
import PlatformRestartEmail from "@guildserver/server/emails/emails/guildserver-restart";
import { renderAsync } from "@react-email/components";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import {
	sendDiscordNotification,
	sendEmailNotification,
	sendGotifyNotification,
	sendSlackNotification,
	sendTelegramNotification,
} from "./utils";

const RESTART_TITLE = `${BRAND_NAME} Server Restarted`;

export const sendPlatformRestartNotifications = async () => {
	const date = new Date();
	const unixDate = ~~(Number(date) / 1000);
	const notificationList = await db.query.notifications.findMany({
		where: eq(notifications.guildserverRestart, true),
		with: {
			email: true,
			discord: true,
			telegram: true,
			slack: true,
			gotify: true,
		},
	});

	for (const notification of notificationList) {
		const { email, discord, telegram, slack, gotify } = notification;

		if (email) {
			const template = await renderAsync(
				PlatformRestartEmail({ date: date.toLocaleString() }),
			).catch();
			await sendEmailNotification(email, RESTART_TITLE, template);
		}

		if (discord) {
			const decorate = (decoration: string, text: string) =>
				`${discord.decoration ? decoration : ""} ${text}`.trim();

			try {
				await sendDiscordNotification(discord, {
					title: decorate(">", `\`✅\` ${RESTART_TITLE}`),
					color: 0x57f287,
					fields: [
						{
							name: decorate("`📅`", "Date"),
							value: `<t:${unixDate}:D>`,
							inline: true,
						},
						{
							name: decorate("`⌚`", "Time"),
							value: `<t:${unixDate}:t>`,
							inline: true,
						},
						{
							name: decorate("`❓`", "Status"),
							value: "Successful",
							inline: true,
						},
					],
					timestamp: date.toISOString(),
					footer: {
						text: `${BRAND_NAME} Restart Notification`,
					},
				});
			} catch (error) {
				console.log(error);
			}
		}

		if (gotify) {
			const decorate = (decoration: string, text: string) =>
				`${gotify.decoration ? decoration : ""} ${text}\n`;
			try {
				await sendGotifyNotification(
					gotify,
					decorate("✅", RESTART_TITLE),
					`${decorate("🕒", `Date: ${date.toLocaleString()}`)}`,
				);
			} catch (error) {
				console.log(error);
			}
		}

		if (telegram) {
			try {
				await sendTelegramNotification(
					telegram,
					`<b>✅ ${RESTART_TITLE}</b>\n\n<b>Date:</b> ${format(date, "PP")}\n<b>Time:</b> ${format(date, "pp")}`,
				);
			} catch (error) {
				console.log(error);
			}
		}

		if (slack) {
			const { channel } = slack;
			try {
				await sendSlackNotification(slack, {
					channel,
					attachments: [
						{
							color: "#00FF00",
							pretext: `:white_check_mark: *${RESTART_TITLE}*`,
							fields: [
								{
									title: "Time",
									value: date.toLocaleString(),
									short: true,
								},
							],
						},
					],
				});
			} catch (error) {
				console.log(error);
			}
		}
	}
};

export const sendGuildServerRestartNotifications = sendPlatformRestartNotifications;
