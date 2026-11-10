import { z } from "zod";
import rawContent from "../../content.json";
import type { ContentCatalog, ItemId, NodeId } from "./types";

export const ContentCatalogSchema = z.object({
  intro: z.array(z.string()),
  nodes: z.record(z.string(), z.array(z.string())),
  death_screens: z.record(z.string(), z.array(z.string())),
  parser_fallbacks: z.array(z.string()),
});

export function loadContent(source: unknown = rawContent): ContentCatalog {
  return ContentCatalogSchema.parse(source);
}

const catalog: ContentCatalog = loadContent();

export function getIntroLines(content: ContentCatalog = catalog): string[] {
  return [...content.intro];
}

const NODE_DISCOVERED_ITEMS: Partial<Record<NodeId, readonly ItemId[]>> = {
  stage1_pack_checked: [],
  stage2_corpse_looted: ["lemon candy", "pack of gum", "mace", "hair ties"],
};

function resolveInventoryPlaceholder(nodeId: NodeId): string {
  const items = NODE_DISCOVERED_ITEMS[nodeId];
  if (!items || items.length === 0) {
    return "nothing";
  }
  return items.join(", ");
}

export function getNodeLines(nodeId: NodeId, content: ContentCatalog = catalog): string[] {
  const lines = content.nodes[nodeId] ?? [];
  if (!lines.some((line) => line.includes("[INVENTORY]"))) {
    return [...lines];
  }
  const replacement = resolveInventoryPlaceholder(nodeId);
  return lines.map((line) => line.replaceAll("[INVENTORY]", replacement));
}

export function toDeathScreenKey(nodeId: NodeId, choice: string): string {
  const normalizedChoice = choice.trim().toLowerCase().replace(/\s+/g, "_");
  return `${nodeId}__${normalizedChoice}`;
}

export function getDeathScreenLines(
  keyOrNodeId: string,
  choice?: string,
  content: ContentCatalog = catalog,
): string[] {
  const key = choice ? toDeathScreenKey(keyOrNodeId as NodeId, choice) : keyOrNodeId;
  return [...(content.death_screens[key] ?? [])];
}

export function getParserFallback(index = 0, content: ContentCatalog = catalog): string[] {
  const fallbacks = content.parser_fallbacks;
  if (fallbacks.length === 0) {
    return [];
  }
  const selected = fallbacks[index % fallbacks.length];
  return selected !== undefined ? [selected] : [];
}
