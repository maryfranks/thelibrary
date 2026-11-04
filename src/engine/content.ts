import rawContent from "../../content.json";
import type { ContentCatalog, NodeId } from "./types";

const catalog: ContentCatalog = rawContent;

export function getIntroLines(): string[] {
  return [...catalog.intro];
}

export function getNodeLines(nodeId: NodeId): string[] {
  return [...(catalog.nodes[nodeId] ?? [])];
}

export function getDeathScreenLines(key: string): string[] {
  return [...(catalog.death_screens[key] ?? [])];
}

export function getParserFallback(index = 0): string {
  const fallbacks = catalog.parser_fallbacks;
  if (fallbacks.length === 0) {
    return "That is not an option here.";
  }
  return fallbacks[index % fallbacks.length] ?? "That is not an option here.";
}
