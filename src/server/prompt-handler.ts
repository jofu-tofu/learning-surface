import { createContextCompiler } from './context.js';
import { createDocumentService, type DocumentService } from './document-service.js';
import { getProvider as getProviderFromRegistry } from './providers/registry.js';
import { TOOL_DEFS, zodToJsonSchema } from '../shared/schemas.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import type { ReplProvider, ToolDefinition, ReasoningEffort } from '../shared/providers.js';
import type { ContextCompiler, LearningDocument, SurfaceContext, VersionStore } from '../shared/types.js';

// === Pure constants and functions (functional core) ===

/** Pre-computed provider tool definitions (constant across the server lifetime). */
export const providerTools: ToolDefinition[] = TOOL_DEFS.map((def) => ({
  name: def.name,
  description: def.description,
  parameters: zodToJsonSchema(def.schema),
}));

/** Pure: build the full system prompt from a context object. */
export function buildSystemPrompt(context: SurfaceContext): string {
  return SYSTEM_PROMPT + JSON.stringify(context, null, 2);
}

/** Pure: determine whether changes warrant creating a version snapshot. */
export function shouldCreateVersion(
  providerType: 'cli' | 'api',
  startVersion: number,
  finalVersion: number,
  startContent: string,
  finalContent: string,
): boolean {
  return providerType === 'cli'
    ? finalContent !== startContent
    : finalVersion > startVersion;
}

/** Pure: build version metadata. */
export function buildVersionMeta(
  prompt: string | null,
  summary: string | null,
  timestamp: string,
): Omit<import('../shared/types.js').VersionMeta, 'version'> {
  return {
    prompt,
    summary,
    timestamp,
    source: 'ai' as const,
  };
}

// === Imperative shell ===

export interface PromptRequest {
  text: string;
  providerId: string;
  modelId: string;
  reasoningEffort?: ReasoningEffort;
  chatDir: string;
  latestDocument: LearningDocument | null;
  versionStore: VersionStore;
}

export interface PromptResult {
  updatedDocument: LearningDocument;
}

export interface PromptDeps {
  docService: DocumentService;
  contextCompiler: ContextCompiler;
  getProvider: (id: string) => ReplProvider | undefined;
}

const defaultDeps: PromptDeps = {
  docService: createDocumentService(),
  contextCompiler: createContextCompiler(),
  getProvider: getProviderFromRegistry,
};

/**
 * Handle a user prompt: compile context, call the AI provider, apply tool calls,
 * and create a version snapshot when the AI finishes.
 */
export async function handlePrompt(
  req: PromptRequest,
  deps: PromptDeps = defaultDeps,
): Promise<PromptResult> {
  const { text, providerId, modelId, reasoningEffort, chatDir, versionStore } = req;
  const { docService, contextCompiler, getProvider } = deps;

  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const filePath = docService.filePath(chatDir);
  // Always ensure the file exists on disk (latestDocument may be in-memory only)
  const currentDoc = docService.ensureExists(filePath);

  // Build context-aware system prompt
  const context = await contextCompiler.compile(currentDoc, chatDir);
  const systemPrompt = buildSystemPrompt(context);

  const startVersion = currentDoc.version;
  const startContent = docService.readRaw(filePath) ?? '';

  if (provider.config.type === 'api') {
    // API mode: pass tool definitions and onToolCall callback
    await provider.complete({
      prompt: text,
      systemPrompt,
      tools: providerTools,
      model: modelId,
      sessionDir: chatDir,
      reasoningEffort,
      async onToolCall(call) {
        const applied = docService.applyTool(
          filePath,
          call.tool,
          call.params,
          startVersion + 1,
        );

        return {
          success: true,
          message: `Applied ${call.tool} → version ${applied.version}`,
        };
      },
    });
  } else {
    // CLI mode: provider edits the file directly
    await provider.complete({
      prompt: text,
      systemPrompt,
      model: modelId,
      sessionDir: chatDir,
      reasoningEffort,
    });
  }

  // Create a version snapshot after the AI finishes
  const finalContent = docService.readRaw(filePath) ?? '';
  const finalDoc = docService.read(filePath);
  if (!finalDoc) {
    throw new Error('Document missing after prompt completion');
  }

  const hasChanges = shouldCreateVersion(
    provider.config.type,
    startVersion,
    finalDoc.version,
    startContent,
    finalContent,
  );

  if (hasChanges) {
    // Ensure version is bumped for CLI mode
    if (finalDoc.version <= startVersion) {
      finalDoc.version = startVersion + 1;
      docService.write(filePath, finalDoc);
    }

    const contentForVersion = docService.readRaw(filePath) ?? '';
    await versionStore.createVersion(
      contentForVersion,
      buildVersionMeta(text, finalDoc.summary ?? null, new Date().toISOString()),
    );
    // Re-write to trigger watcher with updated version list
    docService.write(filePath, finalDoc);
  }

  return { updatedDocument: finalDoc };
}
