/**
 * ESLint rule: stable-websocket-callback
 *
 * Prevents passing useCallback results with non-stable dependencies to
 * useWebSocket's onMessage parameter. Unstable onMessage references cause
 * the WebSocket to reconnect on every change, losing in-flight messages.
 *
 * Correct pattern:
 *   const onMessage = useCallback((...) => { ... }, [stableDep]);
 *   useWebSocket({ onMessage });
 *
 * Wrong pattern (caught by this rule):
 *   const onMessage = useCallback((...) => { ... }, [unstableCallback]);
 *   useWebSocket({ onMessage });
 *
 * Fix: store unstable callbacks in refs and read from ref.current inside
 * the useCallback body, so the dependency array stays stable.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow passing useCallback with deps to useWebSocket onMessage — deps cause reconnects',
    },
    messages: {
      unstableDeps:
        'The onMessage callback passed to useWebSocket depends on [{{deps}}]. ' +
        'Every dependency change reconnects the WebSocket. ' +
        'Move volatile values into refs so the dependency array can be empty or contain only truly stable values.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          /** Identifiers that are known-stable (e.g. dispatch, setState). */
          stableIdentifiers: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    // Identifiers that are inherently stable (React guarantees referential identity).
    const builtinStable = new Set([
      'setState',
      'dispatch',
    ]);
    const userStable = new Set(context.options[0]?.stableIdentifiers ?? []);

    function isStable(name) {
      // setState-style updaters (setFoo) are stable by React convention
      if (/^set[A-Z]/.test(name)) return true;
      if (builtinStable.has(name)) return true;
      if (userStable.has(name)) return true;
      return false;
    }

    // Map: variable name → deps array node  (from useCallback assignments)
    const callbackDeps = new Map();

    return {
      // Track: const foo = useCallback(..., [deps])
      VariableDeclarator(node) {
        if (
          node.init?.type !== 'CallExpression' ||
          node.init.callee?.name !== 'useCallback'
        ) {
          return;
        }
        const args = node.init.arguments;
        if (args.length < 2) return;
        const depsArg = args[1];
        if (depsArg.type !== 'ArrayExpression') return;

        const varName =
          node.id.type === 'Identifier' ? node.id.name : null;
        if (varName) {
          callbackDeps.set(varName, depsArg);
        }
      },

      // Detect: useWebSocket({ ..., onMessage: <expr>, ... })
      CallExpression(node) {
        if (node.callee?.name !== 'useWebSocket') return;
        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type !== 'ObjectExpression') return;

        // Find the onMessage property
        const prop = firstArg.properties.find(
          (p) =>
            p.type === 'Property' &&
            p.key?.type === 'Identifier' &&
            p.key.name === 'onMessage',
        );
        if (!prop) return;

        // Resolve the identifier
        const value = prop.value;
        if (value.type !== 'Identifier') return;
        const name = value.name;

        const depsNode = callbackDeps.get(name);
        if (!depsNode) return; // not from a tracked useCallback

        const unstable = depsNode.elements
          .filter((el) => el && el.type === 'Identifier' && !isStable(el.name))
          .map((el) => el.name);

        if (unstable.length > 0) {
          context.report({
            node: depsNode,
            messageId: 'unstableDeps',
            data: { deps: unstable.join(', ') },
          });
        }
      },
    };
  },
};
