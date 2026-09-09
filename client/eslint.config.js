const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const angularPlugin = require('@angular-eslint/eslint-plugin');
const angularTemplatePlugin = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');

const localRules = {
  rules: {
    'template-attr-single-line': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require native HTML element opening tags to be on a single line.',
        },
        schema: [],
        messages: {
          singleLine: 'Native HTML element opening tags must be on a single line.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());
        function normalizeSingleLine(text) {
          return text
            .replace(/\s+/g, ' ')
            .replace(/\s*>$/, '>')
            .replace(/<\s+/g, '<');
        }
        const handleElement = (node) => {
            if (!node || !node.name || !node.startSourceSpan) {
              return;
            }
            const name = node.name;
            if (name.includes('-')) {
              return;
            }
            const startSpan = node.startSourceSpan;
            const startLine = startSpan.start.line;
            const endLine = startSpan.end.line;
            if (startLine !== endLine) {
              const startOffset = node.startSourceSpan.start.offset;
              const endOffset = node.startSourceSpan.end.offset;
              context.report({
                messageId: 'singleLine',
                loc: {
                  start: { line: startLine + 1, column: startSpan.start.col },
                  end: { line: endLine + 1, column: startSpan.end.col },
                },
                fix(fixer) {
                  const original = sourceCode.text.slice(startOffset, endOffset);
                  const fixed = normalizeSingleLine(original);
                  return fixer.replaceTextRange([startOffset, endOffset], fixed);
                },
              });
            }
        };
        return {
          Element: handleElement,
          Element$1: handleElement,
        };
      },
    },

    'template-asset-src-root': {
      meta: {
        type: 'layout',
        docs: {
          description:
            'Require img src paths that reference assets to start with assets/ (no ../ prefixes).',
        },
        schema: [],
        messages: {
          assetsRoot: 'Asset paths in img src should start with "assets/".',
        },
        fixable: 'code',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());
        function normalizeAssetPath(value) {
          const assetsIndex = value.indexOf('assets/');
          if (assetsIndex === -1) {
            return null;
          }
          const normalized = value.slice(assetsIndex);
          if (normalized === value) {
            return null;
          }
          return normalized;
        }
        const handleElement = (node) => {
            if (!node || !node.name || !node.attrs || !node.startSourceSpan) {
              return;
            }
            const tagName = node.name;
            if (tagName.includes('-')) {
              return;
            }
            if (tagName !== 'img') {
              return;
            }
            for (const attr of node.attrs) {
              if (!attr || attr.name !== 'src' || attr.value == null || !attr.sourceSpan) {
                continue;
              }
              const normalized = normalizeAssetPath(attr.value);
              if (!normalized) {
                continue;
              }
              const startOffset = attr.sourceSpan.start.offset;
              const endOffset = attr.sourceSpan.end.offset;
              context.report({
                messageId: 'assetsRoot',
                loc: {
                  start: { line: attr.sourceSpan.start.line + 1, column: attr.sourceSpan.start.col },
                  end: { line: attr.sourceSpan.end.line + 1, column: attr.sourceSpan.end.col },
                },
                fix(fixer) {
                  const original = sourceCode.text.slice(startOffset, endOffset);
                  const quoteMatch = original.match(/=\s*(['"])/);
                  const quote = quoteMatch ? quoteMatch[1] : '"';
                  const fixed = `${attr.name}=${quote}${normalized}${quote}`;
                  return fixer.replaceTextRange([startOffset, endOffset], fixed);
                },
              });
            }
        };
        return {
          Element: handleElement,
          Element$1: handleElement,
        };
      },
    },

    'template-asset-src-no-parent': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow ../ in img src when referencing assets.',
        },
        schema: [],
        messages: {
          assetsParent:
            'Asset paths in img src must start with "assets/" and must not include "../".',
        },
        fixable: 'code',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());
        function normalizeAssetPath(value) {
          const assetsIndex = value.indexOf('assets/');
          if (assetsIndex === -1) {
            return null;
          }
          const normalized = value.slice(assetsIndex);
          if (normalized === value) {
            return null;
          }
          return normalized;
        }
        return {
          Program() {
            const text = sourceCode.text;
            const regex = /<img[^>]*\ssrc\s*=\s*(['"])([^'"]+)\1/gi;
            let match;
            while ((match = regex.exec(text)) !== null) {
              const matchedTag = match[0];
              const value = match[2];
              if (!value.includes('assets/')) {
                continue;
              }
              if (!value.includes('../')) {
                continue;
              }
              const start = match.index;
              const end = match.index + matchedTag.length;
              context.report({
                messageId: 'assetsParent',
                loc: {
                  start: sourceCode.getLocFromIndex(start),
                  end: sourceCode.getLocFromIndex(end),
                },
                fix(fixer) {
                  const srcAttrRegex = /\bsrc\s*=\s*(['"])([^'"]+)\1/i;
                  const attrMatch = matchedTag.match(srcAttrRegex);
                  if (!attrMatch) {
                    return null;
                  }
                  const normalized = normalizeAssetPath(attrMatch[2]);
                  if (!normalized) {
                    return null;
                  }
                  const quote = attrMatch[1] || '"';
                  const fixedTag = matchedTag.replace(
                    srcAttrRegex,
                    `src=${quote}${normalized}${quote}`
                  );
                  return fixer.replaceTextRange([start, end], fixedTag);
                },
              });
            }
          },
        };
      },
    },

    'decorator-single-line': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require @Input/@Output/@ViewChild property declarations to be on a single line.',
        },
        schema: [],
        messages: {
          singleLine: '@Input/@Output/@ViewChild declarations must be on a single line.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());
        function normalizeSingleLine(text) {
          return text.replace(/\s+/g, ' ').trim();
        }
        function isInputOutputDecorator(dec) {
          const expr = dec.expression;
          if (!expr) {
            return false;
          }
          if (expr.type === 'Identifier') {
            return expr.name === 'Input' || expr.name === 'Output' || expr.name === 'ViewChild';
          }
          if (expr.type === 'CallExpression' && expr.callee.type === 'Identifier') {
            return expr.callee.name === 'Input' || expr.callee.name === 'Output' || expr.callee.name === 'ViewChild';
          }
          return false;
        }
        return {
          PropertyDefinition(node) {
            if (!node.decorators || node.decorators.length === 0) {
              return;
            }
            const hasInputOutput = node.decorators.some(isInputOutputDecorator);
            if (!hasInputOutput || !node.loc) {
              return;
            }
            if (node.loc.start.line !== node.loc.end.line) {
              context.report({
                messageId: 'singleLine',
                node,
                fix(fixer) {
                  const original = sourceCode.getText(node);
                  const fixed = normalizeSingleLine(original);
                  return fixer.replaceText(node, fixed);
                },
              });
            }
          },
        };
      },
    },

    'decorator-first-in-class': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require @Input/@Output/@ViewChild properties to appear before other class members.',
        },
        schema: [],
        messages: {
          order: '@Input/@Output/@ViewChild properties must appear before other class members.',
        },
        fixable: 'code',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());
        function isTargetDecorator(dec) {
          const expr = dec.expression;
          if (!expr) {
            return false;
          }
          if (expr.type === 'Identifier') {
            return expr.name === 'Input' || expr.name === 'Output' || expr.name === 'ViewChild';
          }
          if (expr.type === 'CallExpression' && expr.callee.type === 'Identifier') {
            return expr.callee.name === 'Input' || expr.callee.name === 'Output' || expr.callee.name === 'ViewChild';
          }
          return false;
        }
        function isDecoratedProperty(node) {
          if (!node || node.type !== 'PropertyDefinition' || !node.decorators) {
            return false;
          }
          return node.decorators.some(isTargetDecorator);
        }
        return {
          ClassBody(node) {
            let seenNonDecorated = false;
            const decorated = [];
            const nonDecorated = [];
            let hasViolation = false;

            for (const member of node.body || []) {
              if (isDecoratedProperty(member)) {
                decorated.push(member);
                if (seenNonDecorated) {
                  hasViolation = true;
                }
              } else {
                seenNonDecorated = true;
                nonDecorated.push(member);
              }
            }

            if (!hasViolation || decorated.length === 0) {
              return;
            }

            context.report({
              messageId: 'order',
              node,
              fix(fixer) {
                if (!node.range || !node.body || node.body.length === 0) {
                  return null;
                }

                const reordered = [...decorated, ...nonDecorated];
                const innerStart = node.range[0] + 1;
                const innerEnd = node.range[1] - 1;

                const classLineStart = sourceCode.text.lastIndexOf('\n', node.range[0] - 1) + 1;
                const classIndent = (sourceCode.text.slice(classLineStart, node.range[0]).match(/^\s*/) || [''])[0];
                const memberIndent = `${classIndent}  `;

                const normalizeMemberIndent = (rawText) => {
                  const lines = rawText.replace(/\s+$/, '').split('\n');
                  const nonEmpty = lines.filter(line => line.trim().length > 0);
                  const minIndent = nonEmpty.length > 0
                    ? Math.min(...nonEmpty.map(line => (line.match(/^\s*/) || [''])[0].length))
                    : 0;

                  return lines.map(line => {
                    if (line.trim().length === 0) {
                      return '';
                    }
                    return `${memberIndent}${line.slice(minIndent)}`;
                  }).join('\n');
                };

                const reorderedText = reordered
                  .filter(member => member.range)
                  .map(member => normalizeMemberIndent(sourceCode.text.slice(member.range[0], member.range[1])))
                  .join('\n\n');

                if (!reorderedText) {
                  return null;
                }

                return fixer.replaceTextRange(
                  [innerStart, innerEnd],
                  `\n${reorderedText}\n${classIndent}`
                );
              },
            });
          },
        };
      },
    },

    'class-field-group-spacing': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require class field grouping: private, protected, plain, @Input, @Output.',
        },
        schema: [],
        messages: {
          noBlankLine: 'Class fields must not have blank lines within a group.',
          group: 'Class field groups must be contiguous.',
          requireBlankLine: 'Expected a blank line between access modifier groups.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());

        function getDecoratorName(dec) {
          const expr = dec && dec.expression;
          if (!expr) {
            return null;
          }
          if (expr.type === 'Identifier') {
            return expr.name;
          }
          if (expr.type === 'CallExpression' && expr.callee && expr.callee.type === 'Identifier') {
            return expr.callee.name;
          }
          return null;
        }

        function getGroupKey(node) {
          const decorators = Array.isArray(node.decorators) ? node.decorators : [];
          const hasInput = decorators.some(d => getDecoratorName(d) === 'Input');
          if (hasInput) {
            return 'input';
          }
          const hasOutput = decorators.some(d => getDecoratorName(d) === 'Output');
          if (hasOutput) {
            return 'output';
          }
          if (node.accessibility === 'private') {
            return 'private';
          }
          if (node.accessibility === 'protected') {
            return 'protected';
          }
          return 'plain';
        }

        function getGroupRank(node) {
          const group = getGroupKey(node);
          if (group === 'private') return 0;
          if (group === 'protected') return 1;
          if (group === 'plain') return 2;
          if (group === 'input') return 3;
          if (group === 'output') return 4;
          return 5;
        }

        function normalizeMemberText(text) {
          return text.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
        }

        function normalizeMemberIndent(memberText, indent) {
          const lines = normalizeMemberText(memberText).split('\n');
          const nonEmpty = lines.filter(line => line.trim().length > 0);
          const minIndent = nonEmpty.length > 0
            ? Math.min(...nonEmpty.map(line => (line.match(/^\s*/) || [''])[0].length))
            : 0;

          return lines.map(line => {
            if (line.trim().length === 0) return '';
            return `${indent}${line.slice(minIndent)}`;
          }).join('\n');
        }

        function getMemberText(member) {
          if (!member.range) return '';
          const lineStart = sourceCode.text.lastIndexOf('\n', member.range[0] - 1) + 1;
          return sourceCode.text.slice(lineStart, member.range[1]);
        }

        return {
          ClassBody(node) {
            const body = node.body || [];
            const members = body.filter(m => m.range);
            const fields = members.filter(m => m.type === 'PropertyDefinition');
            const nonFields = members.filter(m => m.type !== 'PropertyDefinition');

            if (fields.length < 2) {
              return;
            }

            const orderedFields = [...fields].sort((a, b) => {
              const rankA = getGroupRank(a);
              const rankB = getGroupRank(b);
              if (rankA !== rankB) return rankA - rankB;
              return members.indexOf(a) - members.indexOf(b);
            });

            const groupedFields = [];
            for (const field of orderedFields) {
              const key = getGroupKey(field);
              const last = groupedFields[groupedFields.length - 1];
              if (!last || last.key !== key) groupedFields.push({ key, members: [field] });
              else last.members.push(field);
            }

            const classLineStart = sourceCode.text.lastIndexOf('\n', node.range[0] - 1) + 1;
            const classIndent = (sourceCode.text.slice(classLineStart, node.range[0]).match(/^\s*/) || [''])[0];
            const memberIndent = `${classIndent}  `;

            const fieldText = groupedFields
              .map(group => group.members
                .map(member => normalizeMemberIndent(getMemberText(member), memberIndent))
                .join('\n'))
              .join('\n\n');

            const nonFieldText = nonFields
              .map(member => normalizeMemberIndent(getMemberText(member), memberIndent))
              .join('\n\n');

            const desiredBodyText = fieldText && nonFieldText
              ? `${fieldText}\n\n${nonFieldText}`
              : (fieldText || nonFieldText);

            const bodyStart = node.range[0] + 1;
            const bodyEnd = node.range[1] - 1;
            const currentBodyText = sourceCode.text
              .slice(bodyStart, bodyEnd)
              .replace(/^\n/, '')
              .replace(/\n\s*$/, '');

            const isOrderCorrect = fields.every((field, idx) => field === orderedFields[idx]);
            const isAllFieldsAtTop =
              nonFields.length === 0 || fields.every(field => members.indexOf(field) < members.indexOf(nonFields[0]));
            const needsSpacingFix = currentBodyText !== desiredBodyText;

            if (!isOrderCorrect || !isAllFieldsAtTop || needsSpacingFix) {
              context.report({
                messageId: 'noBlankLine',
                node,
                fix(fixer) {
                  if (!desiredBodyText) return null;
                  return fixer.replaceTextRange([bodyStart, bodyEnd], `\n${desiredBodyText}\n${classIndent}`);
                },
              });
            }
          },
        };
      },
    },

    'method-blank-line': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require a blank line before each method.',
        },
        schema: [],
        messages: {
          blankLine: 'Expected a blank line before method.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());

        function isMethod(node) {
          return node.type === 'MethodDefinition';
        }

        return {
          ClassBody(node) {
            const body = node.body || [];
            const fixes = [];
            let hasReport = false;

            for (let i = 1; i < body.length; i++) {
              const current = body[i];
              if (!isMethod(current) || !current.range) continue;

              const prev = body[i - 1];
              if (!prev.range) continue;

              const between = sourceCode.text.slice(prev.range[1], current.range[0]);
              if (!/\n\s*\n/.test(between)) {
                hasReport = true;
                fixes.push(fixer => {
                  const lineStart = sourceCode.text.lastIndexOf('\n', current.range[0] - 1) + 1;
                  const linePrefix = sourceCode.text.slice(lineStart, current.range[0]);
                  const indentMatch = linePrefix.match(/^\s*/);
                  const indent = indentMatch ? indentMatch[0] : '';
                  return fixer.replaceTextRange([prev.range[1], current.range[0]], `\n\n${indent}`);
                });
              }
            }

            if (hasReport) {
              context.report({
                messageId: 'blankLine',
                node,
                fix(fixer) {
                  return fixes.map(fn => fn(fixer));
                },
              });
            }
          },
        };
      },
    },

    'no-style-url-in-component': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow styleUrl in Angular component metadata.',
        },
        schema: [],
        messages: {
          noStyleUrl: 'Use styleUrls instead of styleUrl.',
        },
      },
      create(context) {
        function isComponentDecorator(dec) {
          const expr = dec.expression;
          return expr
            && expr.type === 'CallExpression'
            && expr.callee.type === 'Identifier'
            && expr.callee.name === 'Component';
        }

        function hasStyleUrlProperty(arg) {
          return arg
            && arg.type === 'ObjectExpression'
            && arg.properties.some(prop => {
              if (prop.type !== 'Property') return false;
              const key = prop.key;
              return key && (
                (key.type === 'Identifier' && key.name === 'styleUrl')
                || (key.type === 'Literal' && key.value === 'styleUrl')
              );
            });
        }

        return {
          Decorator(node) {
            if (!isComponentDecorator(node)) return;
            const arg = node.expression.arguments && node.expression.arguments[0];
            if (!arg || !hasStyleUrlProperty(arg)) return;
            context.report({ messageId: 'noStyleUrl', node });
          },
        };
      },
    },

    'no-inline-styles-in-component': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow inline styles in Angular component metadata.',
        },
        schema: [],
        messages: {
          noInlineStyles: 'Do not use inline styles in @Component. Use global/custom classes instead.',
        },
      },
      create(context) {
        function isComponentDecorator(dec) {
          const expr = dec.expression;
          return expr
            && expr.type === 'CallExpression'
            && expr.callee.type === 'Identifier'
            && expr.callee.name === 'Component';
        }

        function hasStylesProperty(arg) {
          return arg
            && arg.type === 'ObjectExpression'
            && arg.properties.some(prop => {
              if (prop.type !== 'Property') return false;
              const key = prop.key;
              return key && (
                (key.type === 'Identifier' && key.name === 'styles')
                || (key.type === 'Literal' && key.value === 'styles')
              );
            });
        }

        return {
          Decorator(node) {
            if (!isComponentDecorator(node)) return;
            const arg = node.expression.arguments && node.expression.arguments[0];
            if (!arg || !hasStylesProperty(arg)) return;
            context.report({ messageId: 'noInlineStyles', node });
          },
        };
      },
    },

    'class-field-single-line': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require class field declarations to be on a single line.',
        },
        schema: [],
        messages: {
          singleLine: 'Class field declarations must be on a single line.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());

        function normalizeSingleLine(text) {
          return text.replace(/\s+/g, ' ').trim();
        }

        function allowMultiline(node) {
          if (!node || !node.value) return false;
          const v = node.value;
          return v.type === 'CallExpression' || v.type === 'ArrowFunctionExpression' || v.type === 'FunctionExpression';
        }

        return {
          PropertyDefinition(node) {
            if (!node.loc) return;
            if (allowMultiline(node)) return;
            if (node.loc.start.line !== node.loc.end.line) {
              context.report({
                messageId: 'singleLine',
                node,
                fix(fixer) {
                  const original = sourceCode.getText(node);
                  const fixed = normalizeSingleLine(original);
                  return fixer.replaceText(node, fixed);
                },
              });
            }
          },
        };
      },
    },

    'import-single-line': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require import statements to be on a single line.',
        },
        schema: [],
        messages: {
          singleLine: 'Import statements must be on a single line.',
          spacing: 'Import spacing must be normalized.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());

        function normalizeImport(text) {
          let fixed = text.replace(/\s+/g, ' ').trim();
          fixed = fixed.replace(/\{\s*/g, '{ ');
          fixed = fixed.replace(/\s*\}/g, ' }');
          fixed = fixed.replace(/\s*,\s*/g, ', ');
          fixed = fixed.replace(/\s+from\s+/g, ' from ');
          fixed = fixed.replace(/\s{2,}/g, ' ');
          return fixed;
        }

        return {
          ImportDeclaration(node) {
            if (!node.loc) return;

            const original = sourceCode.getText(node);
            const normalized = normalizeImport(original);

            if (node.loc.start.line !== node.loc.end.line) {
              context.report({
                messageId: 'singleLine',
                node,
                fix(fixer) {
                  return fixer.replaceText(node, normalized);
                },
              });
              return;
            }

            if (original !== normalized) {
              context.report({
                messageId: 'spacing',
                node,
                fix(fixer) {
                  return fixer.replaceText(node, normalized);
                },
              });
            }
          },
        };
      },
    },

    'function-params-single-line': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require function parameter lists to be on a single line.',
        },
        schema: [],
        messages: {
          singleLine: 'Function parameters must be on a single line.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());

        function check(node) {
          if (!node || !node.range) return;

          let open;
          let close;

          if (node.type === 'ArrowFunctionExpression' && node.params.length === 1) {
            const beforeParam = sourceCode.text.slice(node.range[0], node.params[0].range[0]);
            if (!beforeParam.includes('(')) return;
          }

          if (node.params && node.params.length > 0) {
            const firstParam = node.params[0];
            const lastParam = node.params[node.params.length - 1];
            open = sourceCode.getTokenBefore(firstParam, token => token.value === '(');
            close = sourceCode.getTokenAfter(lastParam, token => token.value === ')');
          } else {
            const tokens = sourceCode.getTokens(node);
            const openIndex = tokens.findIndex(token => token.value === '(');
            if (openIndex === -1) return;

            const closeIndex = tokens.findIndex((token, i) => i > openIndex && token.value === ')');
            if (closeIndex === -1) return;

            open = tokens[openIndex];
            close = tokens[closeIndex];
          }

          if (!open || !close || !open.range || !close.range) return;
          if (open.range[0] < node.range[0] || close.range[1] > node.range[1]) return;

          if (open.loc.start.line !== close.loc.end.line) {
            context.report({
              messageId: 'singleLine',
              loc: {
                start: open.loc.start,
                end: close.loc.end,
              },
              fix(fixer) {
                const rangeStart = open.range[1];
                const rangeEnd = close.range[0];
                const original = sourceCode.text.slice(rangeStart, rangeEnd);
                const fixed = original.replace(/\s+/g, ' ').trim();
                return fixer.replaceTextRange([rangeStart, rangeEnd], fixed.length ? ` ${fixed} ` : '');
              },
            });
          }
        }

        return {
          FunctionDeclaration: check,
          FunctionExpression: check,
          ArrowFunctionExpression: check,
          MethodDefinition(node) {
            if (node && node.value) check(node.value);
          },
        };
      },
    },

    'no-unused-imports': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Remove unused imports.',
        },
        schema: [],
        messages: {
          unused: 'Unused import.',
        },
      },
      create(context) {
        return {
          ImportDeclaration(node) {
            if (!node.specifiers || node.specifiers.length === 0) return;

            const sourceCode = (context.sourceCode || context.getSourceCode());
            const variables = sourceCode.getDeclaredVariables(node);
            const usedNames = new Set();

            for (const variable of variables) {
              if (variable.references.length > 0 || variable.eslintUsed) {
                usedNames.add(variable.name);
              }
            }

            const usedSpecifiers = node.specifiers.filter(spec => usedNames.has(spec.local.name));
            if (usedSpecifiers.length === node.specifiers.length) return;

            context.report({ messageId: 'unused', node });
          },
        };
      },
    },

    'rxjs-empty-error-handler-param': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Require empty RxJS error handler callback params to be prefixed with underscore.',
        },
        schema: [],
        messages: {
          underscoreParam:
            'Empty error handlers should use an underscore-prefixed param (for auto-fix compatibility).',
        },
        fixable: 'code',
      },
      create(context) {
        function isIdentifierNamed(node, name) {
          return node && node.type === 'Identifier' && node.name === name;
        }

        return {
          Property(node) {
            if (!node || node.type !== 'Property') return;

            if (
              !(
                isIdentifierNamed(node.key, 'error') ||
                (node.key && node.key.type === 'Literal' && node.key.value === 'error')
              )
            ) {
              return;
            }

            const value = node.value;
            if (!value || value.type !== 'ArrowFunctionExpression') return;
            if (!value.body || value.body.type !== 'BlockStatement' || value.body.body.length !== 0) return;
            if (!value.params || value.params.length !== 1) return;

            const param = value.params[0];
            if (!param || param.type !== 'Identifier') return;
            if (param.name.startsWith('_')) return;

            context.report({
              messageId: 'underscoreParam',
              node: param,
              fix(fixer) {
                return fixer.replaceText(param, `_${param.name}`);
              },
            });
          },
        };
      },
    },

    'assignment-single-line': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Require simple multiline assignment statements to be on a single line.',
        },
        schema: [],
        messages: {
          singleLine: 'Simple assignment statements must be on a single line.',
        },
        fixable: 'whitespace',
      },
      create(context) {
        const sourceCode = (context.sourceCode || context.getSourceCode());

        function normalizeSingleLine(text) {
          let fixed = text.replace(/\s+/g, ' ').trim();
          fixed = fixed.replace(/\s+\./g, '.');
          fixed = fixed.replace(/\s+\?\./g, '?.');
          fixed = fixed.replace(/\?\s+\./g, '?.');
          fixed = fixed.replace(/\s*\|\|\s*/g, ' || ');
          return fixed;
        }

        function isSimpleAssignable(node) {
          if (!node || node.type !== 'AssignmentExpression' || node.operator !== '=') return false;
          const right = node.right;
          return (
            right &&
            right.type === 'LogicalExpression' &&
            right.operator === '||' &&
            right.right &&
            right.right.type === 'Literal' &&
            right.right.value === null
          );
        }

        return {
          ExpressionStatement(node) {
            if (!node || !node.expression || !node.loc) return;
            if (node.loc.start.line === node.loc.end.line) return;
            if (!isSimpleAssignable(node.expression)) return;

            context.report({
              messageId: 'singleLine',
              node,
              fix(fixer) {
                const original = sourceCode.getText(node);
                const fixed = normalizeSingleLine(original);
                return fixer.replaceText(node, fixed);
              },
            });
          },
        };
      },
    },
  },
};

module.exports = [
  {
    ignores: ['node_modules/**', 'build/**', 'coverage/**'],
  },
  {
    files: ['src/app/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.app.json'],
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@angular-eslint': angularPlugin,
      local: localRules,
    },
    rules: {
      curly: ['error', 'all'],
      'brace-style': ['error', 'stroustrup', { allowSingleLine: false }],
      'nonblock-statement-body-position': ['error', 'below'],
      'lines-between-class-members': 'off',
      'function-paren-newline': ['error', 'never'],
      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
          ignoredNodes: [
            'TSTypeParameterInstantiation',
            'TSTypeParameterDeclaration',
            'TSUnionType',
            'TSIntersectionType',
            'TSMappedType'
          ]
        }
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignoreBooleanCoercion: true,
          ignoreConditionalTests: false,
          ignoreMixedLogicalExpressions: true
        }
      ],
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      'no-unused-private-class-members': 'error',
      'local/no-unused-imports': 'error',
      'local/decorator-single-line': 'error',
      'local/decorator-first-in-class': 'off',
      'local/class-field-group-spacing': 'error',
      'local/method-blank-line': 'error',
      'local/class-field-single-line': 'error',
      'local/import-single-line': 'error',
      'local/function-params-single-line': 'error',
      'local/no-style-url-in-component': 'error',
      'local/no-inline-styles-in-component': 'error',
      'local/rxjs-empty-error-handler-param': 'error',
      'local/assignment-single-line': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[computed=true][property.type='Identifier']",
          message: 'Use guarded own-property helpers for dynamic property access.'
        },
        {
          selector: "CallExpression[callee.property.name='setStyle']",
          message: 'Do not manipulate CSS from TS. Use ngClass/static classes.'
        },
        {
          selector: "CallExpression[callee.property.name='removeStyle']",
          message: 'Do not manipulate CSS from TS. Use ngClass/static classes.'
        },
        {
          selector: "CallExpression[callee.property.name='addClass']",
          message: 'Do not manipulate CSS from TS. Use ngClass/static classes.'
        },
        {
          selector: "CallExpression[callee.property.name='removeClass']",
          message: 'Do not manipulate CSS from TS. Use ngClass/static classes.'
        },
        {
          selector: "CallExpression[callee.property.name='style']",
          message: 'Do not set CSS via JS/TS style() calls. Move styles to CSS classes.'
        },
        {
          selector: "AssignmentExpression[left.type='MemberExpression'][left.object.type='MemberExpression'][left.object.property.name='style']",
          message: 'Do not assign element.style.* from TS. Use ngClass/static classes.'
        },
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'Do not assign innerHTML directly.'
        },
        {
          selector: "AssignmentExpression[left.property.name='outerHTML']",
          message: 'Do not assign outerHTML directly.'
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: 'Do not inject HTML directly from TS.'
        }
      ],
    },
  },
  {
    files: ['src/main.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.app.json'],
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/dot-notation': 'error',
    },
  },
  {
    files: ['src/app/**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplatePlugin,
      local: localRules,
    },
    rules: {
      'local/template-attr-single-line': 'error',
      'local/template-asset-src-root': 'error',
      'local/template-asset-src-no-parent': 'error',
      '@angular-eslint/template/no-inline-styles': 'error',
    },
  },
  {
    files: ['src/app/**/*guard*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
