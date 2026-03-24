import { createContextCompiler } from './context.js';
import { createDocumentService, type DocumentService } from './document-service.js';
import { getProvider as getProviderFromRegistry } from './providers/registry.js';
import { zodToJsonSchema, TOOL_DEFS, getPhaseToolDefs } from '../shared/schemas.js';
import { SYSTEM_PROMPT, STUDY_MODE_PREDICT_INSTRUCTIONS, STUDY_MODE_EXPLAIN_INSTRUCTIONS } from './system-prompt.js';
import type { Agent, ToolDefinition, ReasoningEffort } from '../shared/providers.js';
import type { LearningDocument } from '../shared/types.js';
import type { ContextCompiler, SurfaceContext, VersionStore } from './types.js';
import { detectChangedPanes, detectChangedSections } from '../shared/detectChangedPanes.js';
import { createChatLogger } from './logger.js';

// === Pure constants and functions (functional core) ===

/** Pure: build the full system prompt from a context object, with study mode addendum when applicable. */
export function buildSystemPrompt(context: SurfaceContext): string {
  let prompt = SYSTEM_PROMPT;
  if (context.mode === 'study' && context.phase === 'predict') {
    prompt += STUDY_MODE_PREDICT_INSTRUCTIONS;
  } else if (context.mode === 'study' && context.phase === 'explain') {
    prompt += STUDY_MODE_EXPLAIN_INSTRUCTIONS;
  }
  return prompt + JSON.stringify(context, null, 2);
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
  changedSectionIds?: string[],
): Omit<import('../shared/types.js').VersionMeta, 'version'> {
  return {
    prompt,
    summary,
    timestamp,
    source: 'ai' as const,
    ...(changedPanes && changedPanes.length > 0 ? { changedPanes } : {}),
    ...(changedSectionIds && changedSectionIds.length > 0 ? { changedSectionIds } : {}),
  };
}

/** Detect all pane and section changes between two documents. */
export function detectAllChanges(before: LearningDocument, after: LearningDocument): { paneChanges: Set<string>; sectionChanges: Set<string> } {
  return {
    paneChanges: detectChangedPanes(before, after),
    sectionChanges: detectChangedSections(before, after),
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
  /** Study or answer mode — controls phase-indexed tool schema and system prompt addendum. */
  mode?: 'study' | 'answer';
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
  const { text, providerId, modelId, reasoningEffort, chatDir, versionStore, mode = 'answer' } = request;
  const { documentService, contextCompiler, getProvider } = deps;

  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const log = createChatLogger(chatDir);
  log.info('Prompt received', { text, providerId, modelId, reasoningEffort, mode, providerType: provider.config.type });

  const filePath = documentService.filePath(chatDir);
  const currentDoc = documentService.ensureExists(filePath);

  // Build context-aware system prompt with mode
  const context = await contextCompiler.compile(currentDoc, chatDir, mode);
  const systemPrompt = buildSystemPrompt(context);

  // Phase-indexed tool set
  const toolDefs = [...getPhaseToolDefs(context.phase)];
  const providerTools: ToolDefinition[] = toolDefs.map((def) => ({
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
    // Compute which panes/sections changed for persistent metadata
    const { paneChanges, sectionChanges } = detectAllChanges(currentDoc, finalDoc);

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
        [...sectionChanges],
      ),
    );
    // Re-write to trigger watcher with updated version list
    documentService.write(filePath, finalDoc);
  }

  return { updatedDocument: finalDoc };
}
