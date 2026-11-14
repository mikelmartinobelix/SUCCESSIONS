import React from 'react';

interface MathExprProps {
  expr: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Lightweight, high-contrast mathematical expression renderer designed for
 * classroom projection. Supports:
 * - Fractions: \frac{num}{den}
 * - Superscripts: ^{exp} or ^char
 * - Subscripts: _{sub} or _char
 * - Typographic minus (−) and multiplication dot (·)
 * - Italicized variables (a, n) and upright tabular numerals
 */
export const MathExpr: React.FC<MathExprProps> = ({
  expr,
  className = '',
  size = 'md',
}) => {
  const nodes = parseMath(expr, 0).nodes;

  const sizeClasses = {
    sm: 'text-base sm:text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-4xl sm:text-5xl lg:text-6xl',
  }[size];

  return (
    <span
      className={`inline-flex flex-wrap items-center justify-center gap-x-[0.04em] leading-tight font-medium tabular-nums select-none ${sizeClasses} ${className}`}
    >
      {renderNodes(nodes, 'root', size)}
    </span>
  );
};

type MathNode =
  | { type: 'text'; value: string }
  | { type: 'var'; value: string }
  | { type: 'op'; value: string }
  | { type: 'frac'; num: MathNode[]; den: MathNode[] }
  | { type: 'sup'; content: MathNode[] }
  | { type: 'sub'; content: MathNode[] };

function readBracedGroup(input: string, start: number): { group: string; nextIndex: number } {
  if (input[start] !== '{') {
    return { group: input[start] ?? '', nextIndex: start + 1 };
  }
  let depth = 0;
  let i = start;
  while (i < input.length) {
    if (input[i] === '{') depth++;
    else if (input[i] === '}') {
      depth--;
      if (depth === 0) {
        return {
          group: input.slice(start + 1, i),
          nextIndex: i + 1,
        };
      }
    }
    i++;
  }
  return { group: input.slice(start + 1), nextIndex: input.length };
}

function parseMath(input: string, start = 0): { nodes: MathNode[]; nextIndex: number } {
  const nodes: MathNode[] = [];
  let i = start;

  while (i < input.length) {
    // Handle \frac{num}{den}
    if (input.startsWith('\\frac', i)) {
      i += 5;
      while (input[i] === ' ') i++;
      const numGroup = readBracedGroup(input, i);
      i = numGroup.nextIndex;
      while (input[i] === ' ') i++;
      const denGroup = readBracedGroup(input, i);
      i = denGroup.nextIndex;
      nodes.push({
        type: 'frac',
        num: parseMath(numGroup.group, 0).nodes,
        den: parseMath(denGroup.group, 0).nodes,
      });
      continue;
    }

    // Handle \cdot
    if (input.startsWith('\\cdot', i)) {
      i += 5;
      nodes.push({ type: 'op', value: '·' });
      continue;
    }

    const ch = input[i];

    // Superscript
    if (ch === '^') {
      i++;
      const group = readBracedGroup(input, i);
      i = group.nextIndex;
      nodes.push({
        type: 'sup',
        content: parseMath(group.group, 0).nodes,
      });
      continue;
    }

    // Subscript
    if (ch === '_') {
      i++;
      const group = readBracedGroup(input, i);
      i = group.nextIndex;
      nodes.push({
        type: 'sub',
        content: parseMath(group.group, 0).nodes,
      });
      continue;
    }

    // Variables (a, n)
    if (ch === 'a' || ch === 'n') {
      nodes.push({ type: 'var', value: ch });
      i++;
      continue;
    }

    // Operators and symbols
    if (ch === '-') {
      nodes.push({ type: 'op', value: '−' });
      i++;
      continue;
    }
    if (ch === '*') {
      nodes.push({ type: 'op', value: '·' });
      i++;
      continue;
    }
    if (ch === '+' || ch === '=' || ch === '·') {
      nodes.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    // Spaces: normalize slightly
    if (ch === ' ') {
      const prev = nodes[nodes.length - 1];
      if (!prev || prev.type !== 'text' || prev.value !== ' ') {
        nodes.push({ type: 'text', value: ' ' });
      }
      i++;
      continue;
    }

    // Digits, parentheses, punctuation
    let textBuf = ch;
    i++;
    while (
      i < input.length &&
      !'^_+-*=· \\'.includes(input[i]) &&
      input[i] !== 'a' &&
      input[i] !== 'n'
    ) {
      textBuf += input[i];
      i++;
    }
    nodes.push({ type: 'text', value: textBuf });
  }

  return { nodes, nextIndex: i };
}

function renderNodes(
  nodes: MathNode[],
  prefix: string,
  size: 'sm' | 'md' | 'lg' | 'xl',
  inScript = false
): React.ReactNode[] {
  return nodes.map((node, idx) => {
    const key = `${prefix}-${idx}`;
    switch (node.type) {
      case 'var':
        return (
          <span
            key={key}
            className="italic font-serif pr-[0.04em]"
          >
            {node.value}
          </span>
        );
      case 'op': {
        // Look back past any whitespace text node to check for unary minus
        let prevIdx = idx - 1;
        while (prevIdx >= 0) {
          const candidate = nodes[prevIdx];
          if (candidate.type === 'text' && candidate.value === ' ') {
            prevIdx--;
          } else {
            break;
          }
        }
        const prev = prevIdx >= 0 ? nodes[prevIdx] : null;
        const prevIsOpenOrEq =
          !prev ||
          (prev.type === 'text' && (prev.value.endsWith('(') || prev.value.endsWith(','))) ||
          (prev.type === 'op' && prev.value === '=');
        if (node.value === '−' && (inScript || prevIsOpenOrEq)) {
          return (
            <span key={key} className="not-italic">
              −
            </span>
          );
        }
        return (
          <span
            key={key}
            className={inScript ? 'mx-[0.08em] not-italic' : 'mx-[0.14em] not-italic'}
          >
            {node.value}
          </span>
        );
      }
      case 'text':
        if (node.value === ' ') {
          return inScript ? null : <span key={key} className="w-[0.12em]" aria-hidden="true" />;
        }
        return (
          <span key={key} className="not-italic">
            {node.value}
          </span>
        );
      case 'sub':
        return (
          <sub
            key={key}
            className="text-[0.62em] leading-none relative -bottom-[0.18em] align-baseline font-medium"
          >
            {renderNodes(node.content, `${key}-sub`, size, true)}
          </sub>
        );
      case 'sup':
        return (
          <sup
            key={key}
            className="text-[0.62em] leading-none relative -top-[0.38em] align-baseline font-medium"
          >
            {renderNodes(node.content, `${key}-sup`, size, true)}
          </sup>
        );
      case 'frac': {
        const fracTextClass =
          size === 'xl'
            ? 'text-[0.68em]'
            : size === 'lg'
              ? 'text-[0.78em]'
              : 'text-[0.82em]';
        return (
          <span
            key={key}
            className={`inline-flex flex-col items-center justify-center align-middle mx-[0.18em] leading-none ${fracTextClass}`}
          >
            <span className="px-[0.22em] pb-[0.16em] border-b-[1.5px] border-current whitespace-nowrap flex items-center justify-center">
              {renderNodes(node.num, `${key}-num`, size, true)}
            </span>
            <span className="px-[0.22em] pt-[0.18em] whitespace-nowrap flex items-center justify-center">
              {renderNodes(node.den, `${key}-den`, size, true)}
            </span>
          </span>
        );
      }
    }
  });
}
