import { createContextCompiler } from './context.js';
import { createDocumentService, type DocumentService } from './document-service.js';
import { getProvider as getProviderFromRegistry } from './providers/registry.js';
import { zodToJsonSchema, TOOL_DEFS } from '../shared/schemas.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import type { Agent, ToolDefinition, ReasoningEffort } from '../shared/providers.js';
import type { LearningDocument } from '../shared/document.js';
import type { ContextCompiler, SurfaceContext, VersionStore } from './types.js';
import { detectChangedPanes } from '../shared/detectChangedPanes.js';
import { createChatLogger } from './logger.js';

// === Pure constants and functions (functional core) ===

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
  changedPanes?: string[],
): Omit<import('../shared/session.js').VersionMeta, 'version'> {
  return {
    prompt,
    summary,
    timestamp,
    source: 'ai' as const,
    ...(changedPanes && changedPanes.length > 0 ? { changedPanes } : {}),
  };
}

/** Detect pane changes between two documents. */
export function detectAllChanges(before: LearningDocument, after: LearningDocument): { paneChanges: Set<string> } {
  return {
    paneChanges: detectChangedPanes(before, after),
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
  /** Called on each processing phase/tool call for frontend progress feedback. */
  onProgress?: (toolName: string, step: number) => void;
}

interface PromptResult {
  updatedDocument: LearningDocument;
}

interface PromptDeps {
  documentService: DocumentService;
  contextCompiler: ContextCompiler;
  getProvider: (id: string) => Agent | undefined;
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

  const log = createChatLogger(chatDir);
  log.info('Prompt received', { text, providerId, modelId, reasoningEffort, providerType: provider.config.type });

  const filePath = documentService.filePath(chatDir);
  const currentDoc = documentService.ensureExists(filePath);

  // Build context-aware system prompt
  const context = await contextCompiler.compile(currentDoc, chatDir);
  const systemPrompt = buildSystemPrompt(context);

  // Single tool set — no phase indexing
  const providerTools: ToolDefinition[] = TOOL_DEFS.map((def) => ({
    name: def.name,
    description: def.description,
    parameters: zodToJsonSchema(def.schema),
  }));

  const startVersion = currentDoc.version;
  const startContent = documentService.readRaw(filePath) ?? '';

  // Signal "thinking" phase before the AI starts responding
  request.onProgress?.('thinking', 0);

  if (provider.config.type === 'api') {
    // API mode: pass tool definitions and onToolCall callback
    let toolStep = 0;
    await provider.run({
      prompt: text,
      systemPrompt,
      tools: providerTools,
      model: modelId,
      sessionDir: chatDir,
      reasoningEffort,
      async onToolCall(call) {
        toolStep++;
        const t0 = Date.now();
        log.toolCall(call.toolName, call.params);
        request.onProgress?.(call.toolName, toolStep);

        const result = documentService.applyDesignSurface(
          filePath,
          call.params as import('../shared/schemas.js').DesignSurfaceInput,
          startVersion + 1,
        );

        const response = {
          success: result.results.errors.length === 0,
          message: result.results.errors.length > 0
            ? JSON.stringify(result.results)
            : `Applied ${call.toolName} → version ${result.doc.version}`,
        };
        log.toolResult(call.toolName, { ...response, applied: result.results }, Date.now() - t0);
        return response;
      },
    });
  } else {
    // CLI mode: provider edits the file directly
    log.info('CLI mode — tool calls handled via MCP subprocess');
    await provider.run({
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
    // Compute which panes changed for persistent metadata
    const { paneChanges } = detectAllChanges(currentDoc, finalDoc);

    // Ensure version is bumped for CLI mode
    if (finalDoc.version <= startVersion) {
      finalDoc.version = startVersion + 1;
      documentService.write(filePath, finalDoc);
    }

    await versionStore.createVersion(
      finalContent,
      buildVersionMeta(
        text,
        finalDoc.summary ?? null,
        new Date().toISOString(),
        [...paneChanges],
      ),
    );
    // Re-write to trigger watcher with updated version list
    documentService.write(filePath, finalDoc);
  }

  return { updatedDocument: finalDoc };
}
