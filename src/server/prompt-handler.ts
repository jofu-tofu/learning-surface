import { createContextCompiler } from './context.js';
import { createDocumentService, type DocumentService } from './document-service.js';
import { getProvider as getProviderFromRegistry } from './providers/registry.js';
import { TOOL_DEFS, zodToJsonSchema } from '../shared/schemas.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import type { ReplProvider, ToolDefinition, ReasoningEffort } from '../shared/providers.js';
import type { ContextCompiler, LearningDocument, SurfaceContext, VersionStore } from '../shared/types.js';

// === Pure constants and functions (functional core) ===

/** Pre-computed provider tool definitions (constant across the server lifetime). */
const providerTools: ToolDefinition[] = TOOL_DEFS.map((def) => ({
  name: def.name,
  description: def.description,
  parameters: zodToJsonSchema(def.schema),
}));

/** Pure: build the full system prompt from a context object. */
function buildSystemPrompt(context: SurfaceContext): string {
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

interface PromptRequest {
  text: string;
  providerId: string;
  modelId: string;
  reasoningEffort?: ReasoningEffort;
  chatDir: string;
  latestDocument: LearningDocument | null;
  versionStore: VersionStore;
  /** Called on each processing phase/tool call for frontend progress feedback. */
  onProgress?: (toolName: string, step: number) => void;
}

interface PromptResult {
  updatedDocument: LearningDocument;
}

interface PromptDeps {
  documentService: DocumentService;
  contextCompiler: ContextCompiler;
  getProvider: (id: string) => ReplProvider | undefined;
}

const defaultDeps: PromptDeps = {
  documentService: createDocumentService(),
  contextCompiler: createContextCompiler(),
  getProvider: getProviderFromRegistry,
};

/**
 * Handle a user prompt: compile context, call the AI provider, apply tool calls,
 * and create a version snapshot when the AI finishes.
 */
export async function handlePrompt(
  request: PromptRequest,
  deps: PromptDeps = defaultDeps,
): Promise<PromptResult> {
  const { text, providerId, modelId, reasoningEffort, chatDir, versionStore } = request;
  const { documentService, contextCompiler, getProvider } = deps;

  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const filePath = documentService.filePath(chatDir);
  // Always ensure the file exists on disk (latestDocument may be in-memory only)
  const currentDoc = documentService.ensureExists(filePath);

  // Build context-aware system prompt
  const context = await contextCompiler.compile(currentDoc, chatDir);
  const systemPrompt = buildSystemPrompt(context);

  const startVersion = currentDoc.version;
  const startContent = documentService.readRaw(filePath) ?? '';

  // Signal "thinking" phase before the AI starts responding
  request.onProgress?.('thinking', 0);

  if (provider.config.type === 'api') {
    // API mode: pass tool definitions and onToolCall callback
    let toolStep = 0;
    await provider.complete({
      prompt: text,
      systemPrompt,
      tools: providerTools,
      model: modelId,
      sessionDir: chatDir,
      reasoningEffort,
      async onToolCall(call) {
        toolStep++;
        request.onProgress?.(call.toolName, toolStep);

        const applied = documentService.applyTool(
          filePath,
          call.toolName,
          call.params,
          startVersion + 1,
        );

        return {
          success: true,
          message: `Applied ${call.toolName} → version ${applied.version}`,
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
  const finalContent = documentService.readRaw(filePath) ?? '';
  const finalDoc = documentService.read(filePath);
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
      documentService.write(filePath, finalDoc);
    }

    const contentForVersion = documentService.readRaw(filePath) ?? '';
    await versionStore.createVersion(
      contentForVersion,
      buildVersionMeta(text, finalDoc.summary ?? null, new Date().toISOString()),
    );
    // Re-write to trigger watcher with updated version list
    documentService.write(filePath, finalDoc);
  }

  return { updatedDocument: finalDoc };
}
