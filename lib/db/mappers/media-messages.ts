import type { ChatMessage, ChatMessages } from '../../types';
import type { Row } from './shared';

export function photoToRow(r: Row): Row {
  return {
    id: r.id,
    caption: r.caption ?? null,
    region: r.region ?? null,
    url: r.url ?? null,
    thumb_url: r.thumbUrl ?? r.thumb_url ?? null,
    storage_path: r.storagePath ?? r.storage_path ?? null,
    display_bytes: r.displayBytes ?? r.display_bytes ?? null,
    folder_id: r.folderId ?? r.folder_id ?? 'PF-unsorted',
  };
}

export function messagesFromRows(msgRows: Row[], reactionRows: Row[]): ChatMessages {
  const reactionsByMsg = new Map<string, string[]>();
  for (const rx of reactionRows) {
    const mid = String(rx.message_id);
    if (!reactionsByMsg.has(mid)) reactionsByMsg.set(mid, []);
    reactionsByMsg.get(mid)!.push(String(rx.emoji));
  }

  const out: ChatMessages = {};
  for (const m of msgRows) {
    const ch = String(m.channel_id);
    if (!out[ch]) out[ch] = [];
    const msg: ChatMessage = {
      id: String(m.id),
      author: String(m.author),
      text: String(m.body),
      time: String(m.sent_at),
      reactions: reactionsByMsg.get(String(m.id)) ?? [],
    };
    out[ch].push(msg);
  }
  return out;
}

export function rowToPhoto(r: Row, tags: string[] = []): Row {
  return {
    id: r.id,
    caption: r.caption,
    region: r.region,
    url: r.url,
    thumbUrl: r.thumb_url,
    storagePath: r.storage_path,
    displayBytes: r.display_bytes != null ? Number(r.display_bytes) : undefined,
    createdAt: r.created_at != null ? String(r.created_at) : undefined,
    folderId: r.folder_id != null ? String(r.folder_id) : 'PF-unsorted',
    tags,
  };
}

export function photoFolderToRow(r: Row): Row {
  return {
    id: r.id,
    name: r.name ?? null,
    parent_id: r.parentId ?? r.parent_id ?? null,
    sort_order: r.sortOrder ?? r.sort_order ?? 0,
    is_system: Boolean(r.isSystem ?? r.is_system ?? false),
  };
}

export function rowToPhotoFolder(r: Row): Row {
  return {
    id: r.id,
    name: r.name,
    parentId: r.parent_id != null ? String(r.parent_id) : null,
    sortOrder: Number(r.sort_order ?? 0),
    isSystem: Boolean(r.is_system),
    createdAt: r.created_at != null ? String(r.created_at) : undefined,
  };
}

export function messagesToRows(messages: ChatMessages): { messages: Row[]; reactions: Row[] } {
  const msgRows: Row[] = [];
  const reactionRows: Row[] = [];
  for (const [channelId, list] of Object.entries(messages)) {
    for (const m of list) {
      msgRows.push({
        id: m.id,
        channel_id: channelId,
        author: m.author,
        body: m.text,
        sent_at: m.time,
      });
      for (const emoji of m.reactions ?? []) {
        reactionRows.push({ message_id: m.id, emoji, added_by: '' });
      }
    }
  }
  return { messages: msgRows, reactions: reactionRows };
}
