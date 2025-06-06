import {
	isJidGroup,
	downloadMediaMessage,
	type WAMessageKey,
	type WAMessageContent,
	type WASocket,
	type WAContextInfo,
	type WAMessage,
} from 'baileys';
import type { Serialize } from '../../types/index.ts';
import { isMediaMessage } from '../../utils/content.ts';
import { isBotAdmin, parseJidLid } from '../../utils/constants.ts';

export default class ReplyMessage {
	client: Pick<
		WASocket,
		'sendMessage' | 'chatModify' | 'groupMetadata' | 'user'
	>;
	quoted: Serialize['quoted'];
	key: WAMessageKey;
	jid: string | null | undefined;
	sudo: boolean | undefined;
	owner: boolean;
	sender: string | undefined;
	message: WAMessageContent | undefined;
	type: keyof WAMessageContent | undefined;
	text: string | null | undefined;
	viewonce: boolean | undefined;
	mention: string[] | undefined;
	broadcast: boolean | undefined;
	isGroup: boolean | undefined;
	image: boolean | undefined;
	video: boolean | undefined;
	audio: boolean | undefined;
	document: boolean | undefined;
	sticker: boolean | undefined;
	location: boolean | undefined;
	contact: boolean | undefined;
	buttons: boolean | undefined;
	list: boolean | undefined;
	poll: boolean | undefined;
	template: boolean | undefined;

	constructor(quoted: Serialize['quoted'], client: WASocket) {
		const { sendMessage, chatModify, groupMetadata, user } = client;
		this.client = { sendMessage, chatModify, groupMetadata, user };
		this.quoted = quoted;
		this.key = quoted?.key as WAMessageKey;
		this.jid = quoted?.key.remoteJid;
		this.sudo = quoted?.sudo;
		this.owner =
			parseJidLid(client?.user?.id ?? client?.user?.lid!) === quoted?.sender;
		this.sender = quoted?.sender;
		this.message = quoted?.message;
		this.type = quoted?.type;
		this.text = quoted?.text;
		this.viewonce = quoted?.viewOnce;
		this.mention = quoted?.mentions;
		this.broadcast = quoted?.broadcast;
		this.isGroup = isJidGroup(quoted?.key.remoteJid!);
		this.image = quoted?.type === 'imageMessage';
		this.video = quoted?.type === 'videoMessage';
		this.audio = quoted?.type === 'audioMessage';
		this.document = quoted?.type === 'documentMessage';
		this.sticker = quoted?.type === 'stickerMessage';
		this.location = quoted?.type === 'locationMessage';
		this.contact = quoted?.type === 'contactMessage';
		this.buttons = quoted?.type === 'buttonsResponseMessage';
		this.list = quoted?.type === 'listResponseMessage';
		this.poll = quoted?.type === 'pollCreationMessage';
		this.template = quoted?.type === 'templateButtonReplyMessage';
	}

	async edit(text: string) {
		return await this.client.sendMessage(this.jid!, { text, edit: this.key });
	}

	async delete() {
		const isRestrictedGroup =
			this.isGroup && !(await isBotAdmin(this.client, this.jid!));
		const isPrivateNotMe = !this.isGroup && !this.key.fromMe;

		if (isRestrictedGroup || isPrivateNotMe) {
			return await this.client.chatModify(
				{
					deleteForMe: {
						deleteMedia: isMediaMessage(this),
						key: this.key,
						timestamp: Date.now(),
					},
				},
				this.jid!,
			);
		}
		return await this.client.sendMessage(this.jid!, { delete: this.key });
	}

	async forward(jid: string, options?: WAContextInfo & { quoted?: WAMessage }) {
		return await this.client.sendMessage(
			jid,
			{
				forward: this,
				contextInfo: { ...options },
			},
			{ quoted: options?.quoted },
		);
	}

	async react(emoji: string) {
		return await this.client.sendMessage(this.jid!, {
			react: { text: emoji, key: this.key },
		});
	}
	async downloadM() {
		return await downloadMediaMessage(this, 'buffer', {});
	}
}
