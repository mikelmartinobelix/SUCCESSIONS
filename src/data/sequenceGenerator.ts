import {
  ExpressionForm,
  OptionId,
  PromptType,
  SequenceFamily,
  SequenceOption,
  SequenceQuestion,
  TopicFilter,
} from '../types/sequence';

const OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D'];

interface FormulaWithEval {
  formula: string;
  evalFn: (n: number) => string;
}

interface SequenceBlueprint {
  key: string;
  family: SequenceFamily;
  evalFn: (n: number) => string;
  simplified: FormulaWithEval;
  simplifiedDistractors: FormulaWithEval[];
  unsimplified: FormulaWithEval;
  unsimplifiedDistractors: FormulaWithEval[];
  numericDistractorFns: ((n: number) => string)[];
  explanation: string;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function formatFraction(num: number, den: number): string {
  if (den === 0) return '0';
  const sign = (num < 0) !== (den < 0) ? -1 : 1;
  const a = Math.abs(num);
  const b = Math.abs(den);
  const g = gcd(a, b);
  const sn = a / g;
  const sd = b / g;
  if (sd === 1) {
    return sign < 0 && sn !== 0 ? `-${sn}` : `${sn}`;
  }
  return sign < 0 ? `-\\frac{${sn}}{${sd}}` : `\\frac{${sn}}{${sd}}`;
}

function formatLinear(slope: number, intercept: number): string {
  const parts: string[] = [];
  if (slope !== 0) {
    if (slope === 1) parts.push('n');
    else if (slope === -1) parts.push('-n');
    else parts.push(`${slope}n`);
  }
  if (intercept !== 0 || parts.length === 0) {
    if (parts.length === 0) {
      parts.push(`${intercept}`);
    } else if (intercept > 0) {
      parts.push(`+ ${intercept}`);
    } else {
      parts.push(`- ${Math.abs(intercept)}`);
    }
  }
  return `a_n = ${parts.join(' ')}`;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function termsOf(fn: (n: number) => string, start = 1): string[] {
  return [0, 1, 2, 3, 4].map((offset) => fn(start + offset));
}

function sequenceSignature(terms: string[]): string {
  return terms.join('|');
}

/**
 * Generates an arithmetic progression blueprint with rich 3r d'ESO variants:
 * - Standard formula a_1 + (n - 1)·d
 * - Subtracted negative difference a_1 - |d|(n - 1)
 * - Grouped / distributed algebraic form k(n + p) + q or αn + β(n - 1) + γ
 */
function buildArithmeticBlueprint(): SequenceBlueprint {
  const diffs = [-5, -4, -3, -2, 2, 3, 4, 5, 6, 7];
  const d = pickRandom(diffs);
  const a1Pool = d > 0 ? [-5, -3, -2, -1, 1, 2, 3, 4, 5, 7, 8, 10] : [6, 8, 9, 10, 12, 15, 18, 20];
  let a1 = pickRandom(a1Pool);
  // Avoid a1 === d so swapping a1 and d is always a distinct distractor
  if (a1 === d) {
    a1 += 2;
  }

  const c = a1 - d;
  const evalFn = (n: number) => `${d * n + c}`;
  const simplifiedFormula = formatLinear(d, c);

  // Pick unsimplified style
  const styleVariant = Math.floor(Math.random() * 3);
  let unsimplifiedFormula: string;
  let unsimplifiedDistractors: FormulaWithEval[];

  if (styleVariant === 0 || (styleVariant === 2 && d < 0)) {
    // Classic 3r ESO arithmetic formula: a_n = a_1 + (n - 1) · d
    unsimplifiedFormula =
      d > 0
        ? `a_n = ${a1} + (n - 1) \\cdot ${d}`
        : Math.random() < 0.5
          ? `a_n = ${a1} + (n - 1) \\cdot (${d})`
          : `a_n = ${a1} - ${Math.abs(d)}(n - 1)`;

    unsimplifiedDistractors = [
      // Classic off-by-one: using n instead of (n - 1)
      {
        formula: d > 0 ? `a_n = ${a1} + n \\cdot ${d}` : `a_n = ${a1} - ${Math.abs(d)}n`,
        evalFn: (n) => `${a1 + d * n}`,
      },
      // Swapping a1 and d
      {
        formula:
          a1 >= 0
            ? `a_n = ${d} + (n - 1) \\cdot ${a1}`
            : `a_n = ${d} + (n - 1) \\cdot (${a1})`,
        evalFn: (n) => `${d + (n - 1) * a1}`,
      },
      // Sign flip on difference
      {
        formula:
          d > 0
            ? `a_n = ${a1} - (n - 1) \\cdot ${d}`
            : `a_n = ${a1} + ${Math.abs(d)}(n - 1)`,
        evalFn: (n) => `${a1 - (n - 1) * d}`,
      },
      // Missing parentheses mistake: a1 + n - 1 * d
      {
        formula:
          d > 0
            ? `a_n = ${a1} + (n + 1) \\cdot ${d}`
            : `a_n = ${a1} - ${Math.abs(d)}(n + 1)`,
        evalFn: (n) => `${a1 + (n + 1) * d}`,
      },
    ];
  } else if (styleVariant === 1) {
    // Factored / shifted algebraic expression: d(n + p) + q = dn + c
    const p = pickRandom([-2, -1, 1, 2]);
    const q = c - d * p;
    const inner = p > 0 ? `(n + ${p})` : `(n - ${Math.abs(p)})`;
    const outerTail = q === 0 ? '' : q > 0 ? ` + ${q}` : ` - ${Math.abs(q)}`;
    unsimplifiedFormula = `a_n = ${d}${inner}${outerTail}`;

    unsimplifiedDistractors = [
      // Sign error inside parentheses
      {
        formula: `a_n = ${d}${p > 0 ? `(n - ${p})` : `(n + ${Math.abs(p)})`}${outerTail}`,
        evalFn: (n) => `${d * (n - p) + q}`,
      },
      // Forgetting to multiply p by d (common distribution mistake: dn + p + q)
      {
        formula: `a_n = ${d}n ${p + q >= 0 ? `+ ${p + q}` : `- ${Math.abs(p + q)}`}`,
        evalFn: (n) => `${d * n + p + q}`,
      },
      // Flipping sign of q (or shifting by 2 if q === 0)
      {
        formula:
          q !== 0
            ? `a_n = ${d}${inner}${q > 0 ? ` - ${q}` : ` + ${Math.abs(q)}`}`
            : `a_n = ${d}${inner} + ${Math.abs(d)}`,
        evalFn: (n) => (q !== 0 ? `${d * (n + p) - q}` : `${d * (n + p) + Math.abs(d)}`),
      },
      // Different difference d + 1
      {
        formula: `a_n = ${d + 1}${inner}${outerTail}`,
        evalFn: (n) => `${(d + 1) * (n + p) + q}`,
      },
    ];
  } else {
    // Two-term combination: (d + k)n - k(n - 1) + r = dn + (k + r) -> set k + r = c
    const k = pickRandom([1, 2, 3]);
    const r = c - k;
    const firstCoeff = d + k;
    const firstTerm = firstCoeff === 1 ? 'n' : firstCoeff === -1 ? '-n' : `${firstCoeff}n`;
    const secondTerm = k === 1 ? '- (n - 1)' : `- ${k}(n - 1)`;
    const tail = r === 0 ? '' : r > 0 ? ` + ${r}` : ` - ${Math.abs(r)}`;
    unsimplifiedFormula = `a_n = ${firstTerm} ${secondTerm}${tail}`;

    unsimplifiedDistractors = [
      // Distribution sign trap: forgetting minus on -k(-1) -> yields dn - k + r
      {
        formula: `a_n = ${firstTerm} - ${k === 1 ? '(n + 1)' : `${k}(n + 1)`}${tail}`,
        evalFn: (n) => `${firstCoeff * n - k * (n + 1) + r}`,
      },
      // Adding instead of subtracting second term
      {
        formula: `a_n = ${firstTerm} + ${k === 1 ? '(n - 1)' : `${k}(n - 1)`}${tail}`,
        evalFn: (n) => `${firstCoeff * n + k * (n - 1) + r}`,
      },
      // Swapping coefficient
      {
        formula: `a_n = ${firstCoeff + 1}n ${secondTerm}${tail}`,
        evalFn: (n) => `${(firstCoeff + 1) * n - k * (n - 1) + r}`,
      },
      {
        formula: `a_n = ${firstCoeff - 1}n ${secondTerm}${tail}`,
        evalFn: (n) => `${(firstCoeff - 1) * n - k * (n - 1) + r}`,
      },
    ];
  }

  const simplifiedDistractors: FormulaWithEval[] = [
    // Classic mistake: dn + a1 instead of dn + (a1 - d)
    { formula: formatLinear(d, a1), evalFn: (n) => `${d * n + a1}` },
    // Swapping a1 and d
    { formula: formatLinear(a1, d), evalFn: (n) => `${a1 * n + d}` },
    // Sign flip on intercept (or +2 if c === 0)
    {
      formula: c !== 0 ? formatLinear(d, -c) : formatLinear(d, 2),
      evalFn: (n) => (c !== 0 ? `${d * n - c}` : `${d * n + 2}`),
    },
    // Off-by-one step
    { formula: formatLinear(d > 0 ? d + 1 : d - 1, c), evalFn: (n) => `${(d > 0 ? d + 1 : d - 1) * n + c}` },
  ];

  const numericDistractorFns: ((n: number) => string)[] = [
    // Starting at n = 0
    (n) => `${d * (n - 1) + c}`,
    // Using dn + a1
    (n) => `${d * n + a1}`,
    // Wrong sign on constant / wrong step
    (n) => (c !== 0 ? `${d * n - c}` : `${d * n + d}`),
    // Swapping a1 and d
    (n) => `${a1 + (n - 1) * (d > 0 ? d + 1 : d - 1)}`,
  ];

  const diffSign = d > 0 ? `+${d}` : `${d}`;
  return {
    key: `arith_${a1}_${d}_${styleVariant}`,
    family: 'arithmetic',
    evalFn,
    simplified: { formula: simplifiedFormula, evalFn },
    simplifiedDistractors,
    unsimplified: { formula: unsimplifiedFormula, evalFn },
    unsimplifiedDistractors,
    numericDistractorFns,
    explanation: `Progressió aritmètica amb diferència d = ${diffSign} i primer terme a₁ = ${a1}. Forma simplificada: ${simplifiedFormula.replace('a_n = ', 'aₙ = ')}.`,
  };
}

/**
 * Curated bank of Geometric, Quadratic, and Fractional/Alternating 3r d'ESO blueprints.
 * Each entry has carefully verified simplified & unsimplified forms and realistic distractors.
 */
function getCuratedBlueprints(): SequenceBlueprint[] {
  return [
    // --- GEOMETRIC ---
    {
      key: 'geo_3_pow2',
      family: 'geometric',
      evalFn: (n) => `${3 * Math.pow(2, n - 1)}`,
      simplified: {
        formula: 'a_n = 3 \\cdot 2^{n - 1}',
        evalFn: (n) => `${3 * Math.pow(2, n - 1)}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = 2 \\cdot 3^{n - 1}', evalFn: (n) => `${2 * Math.pow(3, n - 1)}` },
        { formula: 'a_n = 3 \\cdot 2^n', evalFn: (n) => `${3 * Math.pow(2, n)}` },
        { formula: 'a_n = 6^{n - 1}', evalFn: (n) => `${Math.pow(6, n - 1)}` },
      ],
      unsimplified: {
        formula: 'a_n = 3 \\cdot 2^{n - 1}',
        evalFn: (n) => `${3 * Math.pow(2, n - 1)}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = 3 \\cdot 2^n', evalFn: (n) => `${3 * Math.pow(2, n)}` },
        { formula: 'a_n = 2 \\cdot 3^{n - 1}', evalFn: (n) => `${2 * Math.pow(3, n - 1)}` },
        { formula: 'a_n = 3 + 2^{n - 1}', evalFn: (n) => `${3 + Math.pow(2, n - 1)}` },
      ],
      numericDistractorFns: [
        (n) => `${3 * Math.pow(2, n)}`,
        (n) => `${2 * Math.pow(3, n - 1)}`,
        (n) => `${3 + 2 * (n - 1)}`,
      ],
      explanation: 'Progressió geomètrica de raó r = 2 i primer terme a₁ = 3.',
    },
    {
      key: 'geo_2_pow_n',
      family: 'geometric',
      evalFn: (n) => `${Math.pow(2, n)}`,
      simplified: {
        formula: 'a_n = 2^n',
        evalFn: (n) => `${Math.pow(2, n)}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = 2n', evalFn: (n) => `${2 * n}` },
        { formula: 'a_n = n^2', evalFn: (n) => `${n * n}` },
        { formula: 'a_n = 2^{n - 1}', evalFn: (n) => `${Math.pow(2, n - 1)}` },
      ],
      unsimplified: {
        formula: 'a_n = 2 \\cdot 2^{n - 1}',
        evalFn: (n) => `${Math.pow(2, n)}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = 2 \\cdot 2^n', evalFn: (n) => `${Math.pow(2, n + 1)}` },
        { formula: 'a_n = 2 + 2(n - 1)', evalFn: (n) => `${2 * n}` },
        { formula: 'a_n = (n + 1) \\cdot 2', evalFn: (n) => `${2 * (n + 1)}` },
      ],
      numericDistractorFns: [
        (n) => `${Math.pow(2, n - 1)}`,
        (n) => `${2 * n}`,
        (n) => `${n * n}`,
      ],
      explanation: 'Potències de 2: 2 · 2ⁿ⁻¹ = 2ⁿ (2, 4, 8, 16, 32).',
    },
    {
      key: 'geo_3_pow_n',
      family: 'geometric',
      evalFn: (n) => `${Math.pow(3, n)}`,
      simplified: {
        formula: 'a_n = 3^n',
        evalFn: (n) => `${Math.pow(3, n)}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = 3^{n - 1}', evalFn: (n) => `${Math.pow(3, n - 1)}` },
        { formula: 'a_n = 3n', evalFn: (n) => `${3 * n}` },
        { formula: 'a_n = n^3', evalFn: (n) => `${Math.pow(n, 3)}` },
      ],
      unsimplified: {
        formula: 'a_n = 3 \\cdot 3^{n - 1}',
        evalFn: (n) => `${Math.pow(3, n)}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = 3 \\cdot 3^n', evalFn: (n) => `${Math.pow(3, n + 1)}` },
        { formula: 'a_n = 3 + 3(n - 1)', evalFn: (n) => `${3 * n}` },
        { formula: 'a_n = 3 \\cdot (n - 1)^2', evalFn: (n) => `${3 * Math.pow(n - 1, 2)}` },
      ],
      numericDistractorFns: [
        (n) => `${Math.pow(3, n - 1)}`,
        (n) => `${3 * n}`,
        (n) => `${Math.pow(n, 3)}`,
      ],
      explanation: 'Progressió geomètrica amb a₁ = 3 i raó r = 3: 3 · 3ⁿ⁻¹ = 3ⁿ.',
    },
    {
      key: 'geo_5_pow2',
      family: 'geometric',
      evalFn: (n) => `${5 * Math.pow(2, n - 1)}`,
      simplified: {
        formula: 'a_n = 5 \\cdot 2^{n - 1}',
        evalFn: (n) => `${5 * Math.pow(2, n - 1)}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = 5 \\cdot 2^n', evalFn: (n) => `${5 * Math.pow(2, n)}` },
        { formula: 'a_n = 2 \\cdot 5^{n - 1}', evalFn: (n) => `${2 * Math.pow(5, n - 1)}` },
        { formula: 'a_n = 10n - 5', evalFn: (n) => `${10 * n - 5}` },
      ],
      unsimplified: {
        formula: 'a_n = 5 \\cdot 2^{n - 1}',
        evalFn: (n) => `${5 * Math.pow(2, n - 1)}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = 5 \\cdot 2^n', evalFn: (n) => `${5 * Math.pow(2, n)}` },
        { formula: 'a_n = 5 + (n - 1) \\cdot 2', evalFn: (n) => `${5 + 2 * (n - 1)}` },
        { formula: 'a_n = 5 \\cdot (2n - 1)', evalFn: (n) => `${5 * (2 * n - 1)}` },
      ],
      numericDistractorFns: [
        (n) => `${5 * Math.pow(2, n)}`,
        (n) => `${5 + 5 * (n - 1)}`,
        (n) => `${2 * Math.pow(5, n - 1)}`,
      ],
      explanation: 'Progressió geomètrica: es multiplica per 2 a cada pas començant per 5.',
    },
    {
      key: 'geo_alt_neg2',
      family: 'geometric',
      evalFn: (n) => `${3 * Math.pow(-2, n - 1)}`,
      simplified: {
        formula: 'a_n = 3 \\cdot (-2)^{n - 1}',
        evalFn: (n) => `${3 * Math.pow(-2, n - 1)}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = 3 \\cdot (-2)^n', evalFn: (n) => `${3 * Math.pow(-2, n)}` },
        { formula: 'a_n = -3 \\cdot 2^{n - 1}', evalFn: (n) => `${-3 * Math.pow(2, n - 1)}` },
        { formula: 'a_n = (-3) \\cdot (-2)^{n - 1}', evalFn: (n) => `${-3 * Math.pow(-2, n - 1)}` },
      ],
      unsimplified: {
        formula: 'a_n = 3 \\cdot (-2)^{n - 1}',
        evalFn: (n) => `${3 * Math.pow(-2, n - 1)}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = 3 \\cdot (-2)^n', evalFn: (n) => `${3 * Math.pow(-2, n)}` },
        { formula: 'a_n = 3 + (n - 1) \\cdot (-2)', evalFn: (n) => `${3 - 2 * (n - 1)}` },
        { formula: 'a_n = -3 \\cdot 2^{n - 1}', evalFn: (n) => `${-3 * Math.pow(2, n - 1)}` },
      ],
      numericDistractorFns: [
        (n) => `${3 * Math.pow(-2, n)}`,
        (n) => `${3 * Math.pow(2, n - 1)}`,
        (n) => `${-3 * Math.pow(-2, n - 1)}`,
      ],
      explanation: 'Progressió geomètrica alternada amb a₁ = 3 i raó r = −2.',
    },
    {
      key: 'geo_half',
      family: 'geometric',
      evalFn: (n) => formatFraction(1, Math.pow(2, n)),
      simplified: {
        formula: 'a_n = \\frac{1}{2^n}',
        evalFn: (n) => formatFraction(1, Math.pow(2, n)),
      },
      simplifiedDistractors: [
        { formula: 'a_n = \\frac{1}{2n}', evalFn: (n) => formatFraction(1, 2 * n) },
        { formula: 'a_n = \\frac{1}{n^2}', evalFn: (n) => formatFraction(1, n * n) },
        { formula: 'a_n = \\frac{1}{2^{n - 1}}', evalFn: (n) => formatFraction(1, Math.pow(2, n - 1)) },
      ],
      unsimplified: {
        formula: 'a_n = \\frac{1}{2} \\cdot \\frac{1}{2^{n - 1}}',
        evalFn: (n) => formatFraction(1, Math.pow(2, n)),
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = \\frac{1}{2} + \\frac{n - 1}{2}', evalFn: (n) => formatFraction(n, 2) },
        { formula: 'a_n = \\frac{1}{2(n + 1)}', evalFn: (n) => formatFraction(1, 2 * (n + 1)) },
        { formula: 'a_n = \\frac{1}{2 \\cdot 2^n}', evalFn: (n) => formatFraction(1, Math.pow(2, n + 1)) },
      ],
      numericDistractorFns: [
        (n) => formatFraction(1, Math.pow(2, n - 1)),
        (n) => formatFraction(1, 2 * n),
        (n) => formatFraction(1, n + 1),
      ],
      explanation: 'Cada terme és la meitat de l’anterior: 1/2, 1/4, 1/8, 1/16, 1/32.',
    },

    // --- QUADRATIC ---
    {
      key: 'quad_n2_plus_2n',
      family: 'quadratic',
      evalFn: (n) => `${n * n + 2 * n}`,
      simplified: {
        formula: 'a_n = n^2 + 2n',
        evalFn: (n) => `${n * n + 2 * n}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = n^2 + 2', evalFn: (n) => `${n * n + 2}` },
        { formula: 'a_n = 2n^2 + 1', evalFn: (n) => `${2 * n * n + 1}` },
        { formula: 'a_n = n^2 + n', evalFn: (n) => `${n * n + n}` },
      ],
      unsimplified: {
        formula: 'a_n = (n + 1)^2 - 1',
        evalFn: (n) => `${n * n + 2 * n}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = (n + 1)^2 + 1', evalFn: (n) => `${(n + 1) * (n + 1) + 1}` },
        { formula: 'a_n = (n - 1)^2 + 2', evalFn: (n) => `${(n - 1) * (n - 1) + 2}` },
        { formula: 'a_n = n(n + 1) - 1', evalFn: (n) => `${n * (n + 1) - 1}` },
      ],
      numericDistractorFns: [
        (n) => `${n * n + 2}`,
        (n) => `${(n + 1) * (n + 1)}`,
        (n) => `${(n - 1) * (n - 1) + 2 * (n - 1)}`,
      ],
      explanation: 'Desenvolupant (n + 1)² − 1 s’obté n² + 2n + 1 − 1 = n² + 2n.',
    },
    {
      key: 'quad_n2_plus_n',
      family: 'quadratic',
      evalFn: (n) => `${n * n + n}`,
      simplified: {
        formula: 'a_n = n^2 + n',
        evalFn: (n) => `${n * n + n}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = n^2 + 1', evalFn: (n) => `${n * n + 1}` },
        { formula: 'a_n = 2n^2', evalFn: (n) => `${2 * n * n}` },
        { formula: 'a_n = n^2 - n', evalFn: (n) => `${n * n - n}` },
      ],
      unsimplified: {
        formula: 'a_n = n(n + 1)',
        evalFn: (n) => `${n * n + n}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = n(n - 1)', evalFn: (n) => `${n * (n - 1)}` },
        { formula: 'a_n = (n + 1)(n + 2)', evalFn: (n) => `${(n + 1) * (n + 2)}` },
        { formula: 'a_n = n(n + 2)', evalFn: (n) => `${n * (n + 2)}` },
      ],
      numericDistractorFns: [
        (n) => `${n * (n - 1)}`,
        (n) => `${n * n + 1}`,
        (n) => `${2 * n}`,
      ],
      explanation: 'Producte de dos naturals consecutius: n(n + 1) = n² + n.',
    },
    {
      key: 'quad_n2_minus_2n_plus_2',
      family: 'quadratic',
      evalFn: (n) => `${n * n - 2 * n + 2}`,
      simplified: {
        formula: 'a_n = n^2 - 2n + 2',
        evalFn: (n) => `${n * n - 2 * n + 2}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = n^2 + 1', evalFn: (n) => `${n * n + 1}` },
        { formula: 'a_n = n^2 - 2n + 1', evalFn: (n) => `${n * n - 2 * n + 1}` },
        { formula: 'a_n = n^2 - 1', evalFn: (n) => `${n * n - 1}` },
      ],
      unsimplified: {
        formula: 'a_n = (n - 1)^2 + 1',
        evalFn: (n) => `${n * n - 2 * n + 2}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = (n + 1)^2 - 1', evalFn: (n) => `${(n + 1) * (n + 1) - 1}` },
        { formula: 'a_n = (n - 1)^2 - 1', evalFn: (n) => `${(n - 1) * (n - 1) - 1}` },
        { formula: 'a_n = n^2 - 1 + 1', evalFn: (n) => `${n * n}` },
      ],
      numericDistractorFns: [
        (n) => `${n * n + 1}`,
        (n) => `${(n - 1) * (n - 1)}`,
        (n) => `${(n + 1) * (n + 1) + 1}`,
      ],
      explanation: 'Desenvolupant (n − 1)² + 1 s’obté n² − 2n + 1 + 1 = n² − 2n + 2.',
    },
    {
      key: 'quad_2n2_minus_1',
      family: 'quadratic',
      evalFn: (n) => `${2 * n * n - 1}`,
      simplified: {
        formula: 'a_n = 2n^2 - 1',
        evalFn: (n) => `${2 * n * n - 1}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = 4n^2 - 1', evalFn: (n) => `${4 * n * n - 1}` },
        { formula: 'a_n = 2n^2 + 1', evalFn: (n) => `${2 * n * n + 1}` },
        { formula: 'a_n = n^2 + 1', evalFn: (n) => `${n * n + 1}` },
      ],
      unsimplified: {
        formula: 'a_n = 2(n^2 - 1) + 1',
        evalFn: (n) => `${2 * n * n - 1}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = (2n)^2 - 1', evalFn: (n) => `${4 * n * n - 1}` },
        { formula: 'a_n = 2(n - 1)^2 + 1', evalFn: (n) => `${2 * (n - 1) * (n - 1) + 1}` },
        { formula: 'a_n = 2(n^2 + 1) - 1', evalFn: (n) => `${2 * (n * n + 1) - 1}` },
      ],
      numericDistractorFns: [
        // Classic trap: (2n)^2 - 1 instead of 2(n^2) - 1
        (n) => `${4 * n * n - 1}`,
        (n) => `${2 * n * n + 1}`,
        (n) => `${2 * (n - 1) * (n - 1) - 1}`,
      ],
      explanation: 'Compte amb la prioritat d’operacions: primer elevem n al quadrat i després multipliquem per 2.',
    },
    {
      key: 'quad_n2_minus_n',
      family: 'quadratic',
      evalFn: (n) => `${n * n - n}`,
      simplified: {
        formula: 'a_n = n^2 - n',
        evalFn: (n) => `${n * n - n}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = n^2 - 1', evalFn: (n) => `${n * n - 1}` },
        { formula: 'a_n = n^2 + n', evalFn: (n) => `${n * n + n}` },
        { formula: 'a_n = 2n - 2', evalFn: (n) => `${2 * n - 2}` },
      ],
      unsimplified: {
        formula: 'a_n = n(n - 1)',
        evalFn: (n) => `${n * n - n}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = n(n + 1)', evalFn: (n) => `${n * (n + 1)}` },
        { formula: 'a_n = (n - 1)(n - 2)', evalFn: (n) => `${(n - 1) * (n - 2)}` },
        { formula: 'a_n = 2(n - 1)', evalFn: (n) => `${2 * (n - 1)}` },
      ],
      numericDistractorFns: [
        (n) => `${n * (n + 1)}`,
        (n) => `${(n - 1) * (n - 1)}`,
        (n) => `${2 * (n - 1)}`,
      ],
      explanation: 'Factoritzant n(n − 1) obtenim la forma simplificada n² − n.',
    },

    // --- FRACTIONAL & ALTERNATING ---
    {
      key: 'frac_n_over_n1',
      family: 'fractional',
      evalFn: (n) => formatFraction(n, n + 1),
      simplified: {
        formula: 'a_n = \\frac{n}{n + 1}',
        evalFn: (n) => formatFraction(n, n + 1),
      },
      simplifiedDistractors: [
        { formula: 'a_n = \\frac{n + 1}{n}', evalFn: (n) => formatFraction(n + 1, n) },
        { formula: 'a_n = \\frac{n}{n + 2}', evalFn: (n) => formatFraction(n, n + 2) },
        { formula: 'a_n = \\frac{n - 1}{n}', evalFn: (n) => formatFraction(n - 1, n) },
      ],
      unsimplified: {
        formula: 'a_n = 1 - \\frac{1}{n + 1}',
        evalFn: (n) => formatFraction(n, n + 1),
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = 1 + \\frac{1}{n + 1}', evalFn: (n) => formatFraction(n + 2, n + 1) },
        { formula: 'a_n = 1 - \\frac{1}{n}', evalFn: (n) => formatFraction(n - 1, n) },
        { formula: 'a_n = 1 + \\frac{1}{n}', evalFn: (n) => formatFraction(n + 1, n) },
      ],
      numericDistractorFns: [
        (n) => formatFraction(n - 1, n),
        (n) => formatFraction(n + 1, n + 2),
        (n) => formatFraction(n + 1, n),
      ],
      explanation: 'Operant 1 − 1/(n + 1) = (n + 1 − 1)/(n + 1) = n/(n + 1).',
    },
    {
      key: 'frac_n1_over_n',
      family: 'fractional',
      evalFn: (n) => formatFraction(n + 1, n),
      simplified: {
        formula: 'a_n = \\frac{n + 1}{n}',
        evalFn: (n) => formatFraction(n + 1, n),
      },
      simplifiedDistractors: [
        { formula: 'a_n = \\frac{n}{n + 1}', evalFn: (n) => formatFraction(n, n + 1) },
        { formula: 'a_n = \\frac{2n}{n + 1}', evalFn: (n) => formatFraction(2 * n, n + 1) },
        { formula: 'a_n = \\frac{n + 2}{n + 1}', evalFn: (n) => formatFraction(n + 2, n + 1) },
      ],
      unsimplified: {
        formula: 'a_n = 1 + \\frac{1}{n}',
        evalFn: (n) => formatFraction(n + 1, n),
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = 1 + \\frac{1}{n + 1}', evalFn: (n) => formatFraction(n + 2, n + 1) },
        { formula: 'a_n = 1 - \\frac{1}{n}', evalFn: (n) => formatFraction(n - 1, n) },
        { formula: 'a_n = 2 - \\frac{1}{n}', evalFn: (n) => formatFraction(2 * n - 1, n) },
      ],
      numericDistractorFns: [
        (n) => formatFraction(n, n + 1),
        (n) => formatFraction(n + 2, n + 1),
        (n) => formatFraction(2 * n - 1, n),
      ],
      explanation: 'Sumant la fracció: 1 + 1/n = (n + 1)/n.',
    },
    {
      key: 'frac_2n_minus_1_over_n1',
      family: 'fractional',
      evalFn: (n) => formatFraction(2 * n - 1, n + 1),
      simplified: {
        formula: 'a_n = \\frac{2n - 1}{n + 1}',
        evalFn: (n) => formatFraction(2 * n - 1, n + 1),
      },
      simplifiedDistractors: [
        { formula: 'a_n = \\frac{2n + 1}{n + 1}', evalFn: (n) => formatFraction(2 * n + 1, n + 1) },
        { formula: 'a_n = \\frac{2n - 1}{n}', evalFn: (n) => formatFraction(2 * n - 1, n) },
        { formula: 'a_n = \\frac{n + 1}{2n - 1}', evalFn: (n) => formatFraction(n + 1, 2 * n - 1) },
      ],
      unsimplified: {
        formula: 'a_n = \\frac{1 + 2(n - 1)}{n + 1}',
        evalFn: (n) => formatFraction(2 * n - 1, n + 1),
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = \\frac{1 + 2n}{n + 1}', evalFn: (n) => formatFraction(2 * n + 1, n + 1) },
        { formula: 'a_n = \\frac{1 + 2(n - 1)}{n}', evalFn: (n) => formatFraction(2 * n - 1, n) },
        { formula: 'a_n = \\frac{1 + 2(n - 1)}{n + 2}', evalFn: (n) => formatFraction(2 * n - 1, n + 2) },
      ],
      numericDistractorFns: [
        (n) => formatFraction(2 * n + 1, n + 1),
        (n) => formatFraction(2 * n - 1, n),
        (n) => formatFraction(2 * n + 1, n + 2),
      ],
      explanation: 'Al numerador: 1 + 2(n − 1) = 2n − 1; al denominador: n + 1.',
    },
    {
      key: 'alt_neg1_n_times_n',
      family: 'fractional',
      evalFn: (n) => `${Math.pow(-1, n) * n}`,
      simplified: {
        formula: 'a_n = (-1)^n \\cdot n',
        evalFn: (n) => `${Math.pow(-1, n) * n}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = (-1)^{n + 1} \\cdot n', evalFn: (n) => `${Math.pow(-1, n + 1) * n}` },
        { formula: 'a_n = (-1)^n \\cdot 2n', evalFn: (n) => `${Math.pow(-1, n) * 2 * n}` },
        { formula: 'a_n = -n', evalFn: (n) => `${-n}` },
      ],
      unsimplified: {
        formula: 'a_n = (-1)^n \\cdot (1 + (n - 1))',
        evalFn: (n) => `${Math.pow(-1, n) * n}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = (-1)^{n - 1} \\cdot n', evalFn: (n) => `${Math.pow(-1, n - 1) * n}` },
        { formula: 'a_n = (-1)^n \\cdot (n + 1)', evalFn: (n) => `${Math.pow(-1, n) * (n + 1)}` },
        { formula: 'a_n = (-1)^{n + 1} \\cdot (n + 1)', evalFn: (n) => `${Math.pow(-1, n + 1) * (n + 1)}` },
      ],
      numericDistractorFns: [
        (n) => `${Math.pow(-1, n + 1) * n}`,
        (n) => `${Math.pow(-1, n) * (n - 1)}`,
        (n) => `${Math.pow(-1, n) * (n + 1)}`,
      ],
      explanation: 'El factor (−1)ⁿ alterna el signe: negatiu en posicions senars i positiu en parells.',
    },
    {
      key: 'alt_neg1_n1_times_odd',
      family: 'fractional',
      evalFn: (n) => `${Math.pow(-1, n + 1) * (2 * n - 1)}`,
      simplified: {
        formula: 'a_n = (-1)^{n + 1} \\cdot (2n - 1)',
        evalFn: (n) => `${Math.pow(-1, n + 1) * (2 * n - 1)}`,
      },
      simplifiedDistractors: [
        { formula: 'a_n = (-1)^n \\cdot (2n - 1)', evalFn: (n) => `${Math.pow(-1, n) * (2 * n - 1)}` },
        { formula: 'a_n = (-1)^{n + 1} \\cdot (2n + 1)', evalFn: (n) => `${Math.pow(-1, n + 1) * (2 * n + 1)}` },
        { formula: 'a_n = (-1)^n \\cdot 2n', evalFn: (n) => `${Math.pow(-1, n) * 2 * n}` },
      ],
      unsimplified: {
        formula: 'a_n = (-1)^{n - 1} \\cdot (1 + 2(n - 1))',
        evalFn: (n) => `${Math.pow(-1, n + 1) * (2 * n - 1)}`,
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = (-1)^n \\cdot (1 + 2(n - 1))', evalFn: (n) => `${Math.pow(-1, n) * (2 * n - 1)}` },
        { formula: 'a_n = (-1)^{n - 1} \\cdot (1 + 2n)', evalFn: (n) => `${Math.pow(-1, n + 1) * (2 * n + 1)}` },
        { formula: 'a_n = (-1)^n \\cdot (2n + 1)', evalFn: (n) => `${Math.pow(-1, n) * (2 * n + 1)}` },
      ],
      numericDistractorFns: [
        (n) => `${Math.pow(-1, n) * (2 * n - 1)}`,
        (n) => `${Math.pow(-1, n + 1) * (2 * n + 1)}`,
        (n) => `${2 * n - 1}`,
      ],
      explanation: 'Nombres senars amb signe alternat començant en positiu (+1, −3, +5, −7, +9).',
    },
  ];
}

interface ContextBlueprint extends SequenceBlueprint {
  contextLabel: string;
  promptContext: string;
}

function getContextBlueprints(): ContextBlueprint[] {
  return [
    {
      key: 'ctx_teatre',
      family: 'arithmetic',
      contextLabel: 'Auditori',
      promptContext:
        'En un auditori, la primera fila té 14 butaques i cada fila següent en té 3 més que l’anterior. Quantes butaques té la fila n?',
      evalFn: (n) => `${3 * n + 11}`,
      simplified: { formula: 'a_n = 3n + 11', evalFn: (n) => `${3 * n + 11}` },
      simplifiedDistractors: [
        { formula: 'a_n = 3n + 14', evalFn: (n) => `${3 * n + 14}` },
        { formula: 'a_n = 14n + 3', evalFn: (n) => `${14 * n + 3}` },
        { formula: 'a_n = 3n - 11', evalFn: (n) => `${3 * n - 11}` },
      ],
      unsimplified: { formula: 'a_n = 14 + (n - 1) \\cdot 3', evalFn: (n) => `${3 * n + 11}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 14 + n \\cdot 3', evalFn: (n) => `${14 + 3 * n}` },
        { formula: 'a_n = 3 + (n - 1) \\cdot 14', evalFn: (n) => `${3 + 14 * (n - 1)}` },
        { formula: 'a_n = 14 - 3(n - 1)', evalFn: (n) => `${14 - 3 * (n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Progressió aritmètica amb a₁ = 14 i d = +3. Simplificant: 14 + 3n − 3 = 3n + 11.',
    },
    {
      key: 'ctx_estalvi',
      family: 'arithmetic',
      contextLabel: 'Estalvi setmanal',
      promptContext:
        'La Clara posa 20 € a la guardiola la primera setmana i cada setmana hi posa 5 € més que l’anterior (20 €, 25 €, 30 €…). Quants euros hi posa la setmana n?',
      evalFn: (n) => `${5 * n + 15}`,
      simplified: { formula: 'a_n = 5n + 15', evalFn: (n) => `${5 * n + 15}` },
      simplifiedDistractors: [
        { formula: 'a_n = 5n + 20', evalFn: (n) => `${5 * n + 20}` },
        { formula: 'a_n = 20n + 5', evalFn: (n) => `${20 * n + 5}` },
        { formula: 'a_n = 5n - 15', evalFn: (n) => `${5 * n - 15}` },
      ],
      unsimplified: { formula: 'a_n = 20 + (n - 1) \\cdot 5', evalFn: (n) => `${5 * n + 15}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 20 + 5n', evalFn: (n) => `${20 + 5 * n}` },
        { formula: 'a_n = 5 + (n - 1) \\cdot 20', evalFn: (n) => `${5 + 20 * (n - 1)}` },
        { formula: 'a_n = 20 - (n - 1) \\cdot 5', evalFn: (n) => `${20 - 5 * (n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Cada setmana augmenta 5 € partint de 20 €: 20 + 5(n − 1) = 5n + 15.',
    },
    {
      key: 'ctx_diposit',
      family: 'arithmetic',
      contextLabel: 'Dipòsit d’aigua',
      promptContext:
        'Un dipòsit té 120 litres d’aigua el primer dia i cada dia en perd 8 litres respecte del dia anterior. Quants litres queden al dipòsit el dia n?',
      evalFn: (n) => `${-8 * n + 128}`,
      simplified: { formula: 'a_n = -8n + 128', evalFn: (n) => `${-8 * n + 128}` },
      simplifiedDistractors: [
        { formula: 'a_n = -8n + 120', evalFn: (n) => `${-8 * n + 120}` },
        { formula: 'a_n = 8n + 112', evalFn: (n) => `${8 * n + 112}` },
        { formula: 'a_n = 120n - 8', evalFn: (n) => `${120 * n - 8}` },
      ],
      unsimplified: { formula: 'a_n = 120 - 8(n - 1)', evalFn: (n) => `${-8 * n + 128}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 120 - 8n', evalFn: (n) => `${120 - 8 * n}` },
        { formula: 'a_n = 120 + 8(n - 1)', evalFn: (n) => `${120 + 8 * (n - 1)}` },
        { formula: 'a_n = 120 - 8(n + 1)', evalFn: (n) => `${120 - 8 * (n + 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Progressió decreixent amb a₁ = 120 i d = −8: 120 − 8n + 8 = −8n + 128.',
    },
    {
      key: 'ctx_taules',
      family: 'arithmetic',
      contextLabel: 'Taules i cadires',
      promptContext:
        'En una taula quadrada hi seuen 4 persones; si unim 2 taules en fila hi seuen 6 persones; amb 3 taules hi seuen 8 persones. Quantes persones hi caben amb n taules unides?',
      evalFn: (n) => `${2 * n + 2}`,
      simplified: { formula: 'a_n = 2n + 2', evalFn: (n) => `${2 * n + 2}` },
      simplifiedDistractors: [
        { formula: 'a_n = 2n + 4', evalFn: (n) => `${2 * n + 4}` },
        { formula: 'a_n = 4n', evalFn: (n) => `${4 * n}` },
        { formula: 'a_n = 2n - 2', evalFn: (n) => `${2 * n - 2}` },
      ],
      unsimplified: { formula: 'a_n = 4 + 2(n - 1)', evalFn: (n) => `${2 * n + 2}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 4 + 2n', evalFn: (n) => `${4 + 2 * n}` },
        { formula: 'a_n = 4(n - 1) + 2', evalFn: (n) => `${4 * (n - 1) + 2}` },
        { formula: 'a_n = 2 + 4(n - 1)', evalFn: (n) => `${2 + 4 * (n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Cada nova taula afegeix 2 places a les 4 inicials: 4 + 2(n − 1) = 2n + 2.',
    },
    {
      key: 'ctx_triangles',
      family: 'arithmetic',
      contextLabel: 'Triangles amb escuradents',
      promptContext:
        'Per construir 1 triangle amb escuradents en calen 3; per fer-ne 2 units en fila en calen 5; per a 3 triangles en calen 7. Quants escuradents calen per fer n triangles?',
      evalFn: (n) => `${2 * n + 1}`,
      simplified: { formula: 'a_n = 2n + 1', evalFn: (n) => `${2 * n + 1}` },
      simplifiedDistractors: [
        { formula: 'a_n = 2n + 3', evalFn: (n) => `${2 * n + 3}` },
        { formula: 'a_n = 3n', evalFn: (n) => `${3 * n}` },
        { formula: 'a_n = 2n - 1', evalFn: (n) => `${2 * n - 1}` },
      ],
      unsimplified: { formula: 'a_n = 3 + 2(n - 1)', evalFn: (n) => `${2 * n + 1}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 3 + 2n', evalFn: (n) => `${3 + 2 * n}` },
        { formula: 'a_n = 3(n - 1) + 2', evalFn: (n) => `${3 * (n - 1) + 2}` },
        { formula: 'a_n = 2 + 3(n - 1)', evalFn: (n) => `${2 + 3 * (n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'El primer triangle usa 3 escuradents i cada triangle extra n’afegeix 2: 3 + 2(n − 1) = 2n + 1.',
    },
    {
      key: 'ctx_entrenament',
      family: 'arithmetic',
      contextLabel: 'Entrenament diari',
      promptContext:
        'En Marc fa 12 flexions el primer dia i cada dia en fa 4 més que el dia anterior (12, 16, 20…). Quantes flexions fa el dia n?',
      evalFn: (n) => `${4 * n + 8}`,
      simplified: { formula: 'a_n = 4n + 8', evalFn: (n) => `${4 * n + 8}` },
      simplifiedDistractors: [
        { formula: 'a_n = 4n + 12', evalFn: (n) => `${4 * n + 12}` },
        { formula: 'a_n = 12n + 4', evalFn: (n) => `${12 * n + 4}` },
        { formula: 'a_n = 4n - 8', evalFn: (n) => `${4 * n - 8}` },
      ],
      unsimplified: { formula: 'a_n = 12 + (n - 1) \\cdot 4', evalFn: (n) => `${4 * n + 8}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 12 + 4n', evalFn: (n) => `${12 + 4 * n}` },
        { formula: 'a_n = 4 + (n - 1) \\cdot 12', evalFn: (n) => `${4 + 12 * (n - 1)}` },
        { formula: 'a_n = 12 - 4(n - 1)', evalFn: (n) => `${12 - 4 * (n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Progressió aritmètica amb a₁ = 12 i d = +4: 12 + 4(n − 1) = 4n + 8.',
    },
    {
      key: 'ctx_temperatura',
      family: 'arithmetic',
      contextLabel: 'Cambra frigorífica',
      promptContext:
        'Una cambra frigorífica és a 4 °C al minut 1 i la temperatura baixa 3 °C cada minut que passa. Quina temperatura marca al minut n?',
      evalFn: (n) => `${-3 * n + 7}`,
      simplified: { formula: 'a_n = -3n + 7', evalFn: (n) => `${-3 * n + 7}` },
      simplifiedDistractors: [
        { formula: 'a_n = -3n + 4', evalFn: (n) => `${-3 * n + 4}` },
        { formula: 'a_n = 3n + 1', evalFn: (n) => `${3 * n + 1}` },
        { formula: 'a_n = -4n + 3', evalFn: (n) => `${-4 * n + 3}` },
      ],
      unsimplified: { formula: 'a_n = 4 - 3(n - 1)', evalFn: (n) => `${-3 * n + 7}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 4 - 3n', evalFn: (n) => `${4 - 3 * n}` },
        { formula: 'a_n = 4 + 3(n - 1)', evalFn: (n) => `${4 + 3 * (n - 1)}` },
        { formula: 'a_n = -3 + 4(n - 1)', evalFn: (n) => `${-3 + 4 * (n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Partint de 4 °C i restant 3 °C per minut: 4 − 3(n − 1) = −3n + 7.',
    },
    {
      key: 'ctx_lectura',
      family: 'arithmetic',
      contextLabel: 'Pla de lectura',
      promptContext:
        'La Júlia llegeix 15 pàgines el primer dia i cada dia següent en llegeix 6 més que l’anterior (15, 21, 27…). Quantes pàgines llegeix el dia n?',
      evalFn: (n) => `${6 * n + 9}`,
      simplified: { formula: 'a_n = 6n + 9', evalFn: (n) => `${6 * n + 9}` },
      simplifiedDistractors: [
        { formula: 'a_n = 6n + 15', evalFn: (n) => `${6 * n + 15}` },
        { formula: 'a_n = 15n + 6', evalFn: (n) => `${15 * n + 6}` },
        { formula: 'a_n = 6n - 9', evalFn: (n) => `${6 * n - 9}` },
      ],
      unsimplified: { formula: 'a_n = 15 + 6(n - 1)', evalFn: (n) => `${6 * n + 9}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 15 + 6n', evalFn: (n) => `${15 + 6 * n}` },
        { formula: 'a_n = 6 + 15(n - 1)', evalFn: (n) => `${6 + 15 * (n - 1)}` },
        { formula: 'a_n = 15 - 6(n - 1)', evalFn: (n) => `${15 - 6 * (n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Progressió aritmètica amb a₁ = 15 i d = +6: 15 + 6n − 6 = 6n + 9.',
    },
    {
      key: 'ctx_bacteris',
      family: 'geometric',
      contextLabel: 'Cultiu de bacteris',
      promptContext:
        'Un cultiu té 5 bacteris el dia 1 i cada dia se’n duplica la quantitat respecte del dia anterior (5, 10, 20…). Quants bacteris hi ha el dia n?',
      evalFn: (n) => `${5 * Math.pow(2, n - 1)}`,
      simplified: { formula: 'a_n = 5 \\cdot 2^{n - 1}', evalFn: (n) => `${5 * Math.pow(2, n - 1)}` },
      simplifiedDistractors: [
        { formula: 'a_n = 5 \\cdot 2^n', evalFn: (n) => `${5 * Math.pow(2, n)}` },
        { formula: 'a_n = 2 \\cdot 5^{n - 1}', evalFn: (n) => `${2 * Math.pow(5, n - 1)}` },
        { formula: 'a_n = 10n - 5', evalFn: (n) => `${10 * n - 5}` },
      ],
      unsimplified: { formula: 'a_n = 5 \\cdot 2^{n - 1}', evalFn: (n) => `${5 * Math.pow(2, n - 1)}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 5 \\cdot 2^n', evalFn: (n) => `${5 * Math.pow(2, n)}` },
        { formula: 'a_n = 5 + 2(n - 1)', evalFn: (n) => `${5 + 2 * (n - 1)}` },
        { formula: 'a_n = 2 \\cdot 5^{n - 1}', evalFn: (n) => `${2 * Math.pow(5, n - 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Progressió geomètrica amb a₁ = 5 i raó r = 2 (es duplica cada dia).',
    },
    {
      key: 'ctx_paper',
      family: 'geometric',
      contextLabel: 'Plegat de paper',
      promptContext:
        'Dobleguem un full per la meitat successivament: amb 1 plec tenim 2 capes, amb 2 plecs en tenim 4 i amb 3 plecs en tenim 8. Quantes capes tenim amb n plecs?',
      evalFn: (n) => `${Math.pow(2, n)}`,
      simplified: { formula: 'a_n = 2^n', evalFn: (n) => `${Math.pow(2, n)}` },
      simplifiedDistractors: [
        { formula: 'a_n = 2n', evalFn: (n) => `${2 * n}` },
        { formula: 'a_n = n^2', evalFn: (n) => `${n * n}` },
        { formula: 'a_n = 2^{n - 1}', evalFn: (n) => `${Math.pow(2, n - 1)}` },
      ],
      unsimplified: { formula: 'a_n = 2 \\cdot 2^{n - 1}', evalFn: (n) => `${Math.pow(2, n)}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 2 \\cdot 2^n', evalFn: (n) => `${Math.pow(2, n + 1)}` },
        { formula: 'a_n = 2 + 2(n - 1)', evalFn: (n) => `${2 * n}` },
        { formula: 'a_n = 2(n + 1)', evalFn: (n) => `${2 * (n + 1)}` },
      ],
      numericDistractorFns: [],
      explanation: 'Cada plec duplica les capes començant per 2: 2 · 2ⁿ⁻¹ = 2ⁿ.',
    },
    {
      key: 'ctx_missatges',
      family: 'geometric',
      contextLabel: 'Cadena de missatges',
      promptContext:
        'Al pas 1 una notícia arriba a 3 persones; al pas 2 cadascuna l’envia a 3 persones noves (9 persones), i al pas 3 a 27 persones. Quantes persones la reben al pas n?',
      evalFn: (n) => `${Math.pow(3, n)}`,
      simplified: { formula: 'a_n = 3^n', evalFn: (n) => `${Math.pow(3, n)}` },
      simplifiedDistractors: [
        { formula: 'a_n = 3^{n - 1}', evalFn: (n) => `${Math.pow(3, n - 1)}` },
        { formula: 'a_n = 3n', evalFn: (n) => `${3 * n}` },
        { formula: 'a_n = n^3', evalFn: (n) => `${Math.pow(n, 3)}` },
      ],
      unsimplified: { formula: 'a_n = 3 \\cdot 3^{n - 1}', evalFn: (n) => `${Math.pow(3, n)}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = 3 \\cdot 3^n', evalFn: (n) => `${Math.pow(3, n + 1)}` },
        { formula: 'a_n = 3 + 3(n - 1)', evalFn: (n) => `${3 * n}` },
        { formula: 'a_n = 3n^2', evalFn: (n) => `${3 * n * n}` },
      ],
      numericDistractorFns: [],
      explanation: 'Es triplica a cada pas començant per 3: 3 · 3ⁿ⁻¹ = 3ⁿ.',
    },
    {
      key: 'ctx_pilota',
      family: 'fractional',
      contextLabel: 'Rebots d’una pilota',
      promptContext:
        'Una pilota rebota i arriba a 1/2 m al 1r bot, 1/4 m al 2n bot, 1/8 m al 3r bot… A quina alçada (en metres) arriba al bot n?',
      evalFn: (n) => formatFraction(1, Math.pow(2, n)),
      simplified: {
        formula: 'a_n = \\frac{1}{2^n}',
        evalFn: (n) => formatFraction(1, Math.pow(2, n)),
      },
      simplifiedDistractors: [
        { formula: 'a_n = \\frac{1}{2n}', evalFn: (n) => formatFraction(1, 2 * n) },
        { formula: 'a_n = \\frac{1}{2^{n - 1}}', evalFn: (n) => formatFraction(1, Math.pow(2, n - 1)) },
        { formula: 'a_n = \\frac{1}{n^2}', evalFn: (n) => formatFraction(1, n * n) },
      ],
      unsimplified: {
        formula: 'a_n = \\frac{1}{2} \\cdot \\frac{1}{2^{n - 1}}',
        evalFn: (n) => formatFraction(1, Math.pow(2, n)),
      },
      unsimplifiedDistractors: [
        { formula: 'a_n = \\frac{1}{2} + \\frac{n - 1}{2}', evalFn: (n) => formatFraction(n, 2) },
        { formula: 'a_n = \\frac{1}{2(n + 1)}', evalFn: (n) => formatFraction(1, 2 * (n + 1)) },
        { formula: 'a_n = \\frac{1}{2 \\cdot 2^n}', evalFn: (n) => formatFraction(1, Math.pow(2, n + 1)) },
      ],
      numericDistractorFns: [],
      explanation: 'Cada bot arriba a la meitat d’alçada que l’anterior: (1/2) · (1/2)ⁿ⁻¹ = 1/2ⁿ.',
    },
    {
      key: 'ctx_graella',
      family: 'quadratic',
      contextLabel: 'Rectangles de punts',
      promptContext:
        'Una sèrie de rectangles té 1×2 punts a la figura 1, 2×3 punts a la figura 2 i 3×4 punts a la figura 3. Quants punts té la figura n?',
      evalFn: (n) => `${n * (n + 1)}`,
      simplified: { formula: 'a_n = n^2 + n', evalFn: (n) => `${n * n + n}` },
      simplifiedDistractors: [
        { formula: 'a_n = n^2 + 1', evalFn: (n) => `${n * n + 1}` },
        { formula: 'a_n = 2n^2', evalFn: (n) => `${2 * n * n}` },
        { formula: 'a_n = n^2 - n', evalFn: (n) => `${n * n - n}` },
      ],
      unsimplified: { formula: 'a_n = n(n + 1)', evalFn: (n) => `${n * (n + 1)}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = n(n - 1)', evalFn: (n) => `${n * (n - 1)}` },
        { formula: 'a_n = (n + 1)(n + 2)', evalFn: (n) => `${(n + 1) * (n + 2)}` },
        { formula: 'a_n = 2n + 2', evalFn: (n) => `${2 * n + 2}` },
      ],
      numericDistractorFns: [],
      explanation: 'La figura n té n files i (n + 1) columnes: n(n + 1) = n² + n punts.',
    },
    {
      key: 'ctx_mosaic',
      family: 'quadratic',
      contextLabel: 'Mosaics de rajoles',
      promptContext:
        'La figura 1 és un quadrat de 2×2 rajoles menys 1 cantonada (3 rajoles); la figura 2, un de 3×3 menys 1 (8 rajoles); la figura 3, un de 4×4 menys 1 (15 rajoles). Quantes rajoles té la figura n?',
      evalFn: (n) => `${(n + 1) * (n + 1) - 1}`,
      simplified: { formula: 'a_n = n^2 + 2n', evalFn: (n) => `${n * n + 2 * n}` },
      simplifiedDistractors: [
        { formula: 'a_n = n^2 + 2', evalFn: (n) => `${n * n + 2}` },
        { formula: 'a_n = 2n^2 + 1', evalFn: (n) => `${2 * n * n + 1}` },
        { formula: 'a_n = n^2 + n', evalFn: (n) => `${n * n + n}` },
      ],
      unsimplified: { formula: 'a_n = (n + 1)^2 - 1', evalFn: (n) => `${(n + 1) * (n + 1) - 1}` },
      unsimplifiedDistractors: [
        { formula: 'a_n = (n + 1)^2 + 1', evalFn: (n) => `${(n + 1) * (n + 1) + 1}` },
        { formula: 'a_n = (n - 1)^2 + 2', evalFn: (n) => `${(n - 1) * (n - 1) + 2}` },
        { formula: 'a_n = n(n + 1) - 1', evalFn: (n) => `${n * (n + 1) - 1}` },
      ],
      numericDistractorFns: [],
      explanation: 'Un quadrat de costat (n + 1) menys 1 rajola és (n + 1)² − 1 = n² + 2n.',
    },
  ];
}

function selectContextBlueprint(filter: TopicFilter, usedKeys: Set<string>): ContextBlueprint {
  const allCtx = getContextBlueprints();
  const pool =
    filter === 'arithmetic'
      ? allCtx.filter((c) => c.family === 'arithmetic')
      : filter === 'geometric_quadratic'
        ? allCtx.filter((c) => c.family !== 'arithmetic')
        : allCtx;

  const unused = pool.filter((c) => !usedKeys.has(c.key));
  if (unused.length > 0) return pickRandom(unused);
  return pickRandom(pool);
}

function selectBlueprint(filter: TopicFilter, usedKeys: Set<string>): SequenceBlueprint {
  const curated = getCuratedBlueprints();

  if (filter === 'arithmetic') {
    for (let attempt = 0; attempt < 25; attempt++) {
      const bp = buildArithmeticBlueprint();
      if (!usedKeys.has(bp.key)) return bp;
    }
    return buildArithmeticBlueprint();
  }

  if (filter === 'geometric_quadratic') {
    const unused = curated.filter((b) => !usedKeys.has(b.key));
    if (unused.length > 0) return pickRandom(unused);
    return pickRandom(curated);
  }

  // 'all': ~50% arithmetic, ~50% curated geometric/quadratic/fractional
  const preferCurated = Math.random() < 0.5;
  if (preferCurated) {
    const unused = curated.filter((b) => !usedKeys.has(b.key));
    if (unused.length > 0) return pickRandom(unused);
  }

  for (let attempt = 0; attempt < 25; attempt++) {
    const bp = buildArithmeticBlueprint();
    if (!usedKeys.has(bp.key)) return bp;
  }
  return buildArithmeticBlueprint();
}

export function generateQuestion(
  stepIndex: number,
  filter: TopicFilter,
  usedKeys: Set<string>,
  includeContext = true
): SequenceQuestion {
  let promptType: PromptType;
  let expressionForm: ExpressionForm;

  if (filter === 'context') {
    promptType = 'context';
    expressionForm = stepIndex % 2 === 0 ? 'simplified' : 'unsimplified';
  } else if (includeContext) {
    // 6-step alternation covering algebraic, numeric, and context,
    // while strictly alternating simplified and unsimplified on every screen:
    // 0: algebraic (S), 1: numeric (U), 2: context (S), 3: algebraic (U), 4: numeric (S), 5: context (U)
    const mod3 = stepIndex % 3;
    promptType = mod3 === 0 ? 'algebraic' : mod3 === 1 ? 'numeric' : 'context';
    expressionForm = stepIndex % 2 === 0 ? 'simplified' : 'unsimplified';
  } else {
    // Pure 2-way alternation:
    // 0: algebraic (S), 1: numeric (U), 2: algebraic (U), 3: numeric (S)
    promptType = stepIndex % 2 === 0 ? 'algebraic' : 'numeric';
    expressionForm =
      stepIndex % 4 === 0 || stepIndex % 4 === 3 ? 'simplified' : 'unsimplified';
  }

  for (let retry = 0; retry < 30; retry++) {
    const bp: SequenceBlueprint =
      promptType === 'context'
        ? selectContextBlueprint(filter, usedKeys)
        : selectBlueprint(filter, usedKeys);
    const correctTerms = termsOf(bp.evalFn, 1);
    const correctSig = sequenceSignature(correctTerms);

    if (promptType === 'algebraic') {
      const chosenPrompt =
        expressionForm === 'simplified' ? bp.simplified.formula : bp.unsimplified.formula;

      const seenSigs = new Set<string>([correctSig]);
      const distractorTermsList: string[][] = [];

      for (const fn of bp.numericDistractorFns) {
        const terms = termsOf(fn, 1);
        const sig = sequenceSignature(terms);
        if (!seenSigs.has(sig)) {
          seenSigs.add(sig);
          distractorTermsList.push(terms);
        }
        if (distractorTermsList.length === 3) break;
      }

      if (distractorTermsList.length < 3) continue;

      const rawOptions: { terms: string[]; isCorrect: boolean }[] = shuffle([
        { terms: correctTerms, isCorrect: true },
        ...distractorTermsList.map((terms) => ({ terms, isCorrect: false })),
      ]);

      const options: SequenceOption[] = rawOptions.map((item, idx) => ({
        id: OPTION_IDS[idx],
        terms: item.terms,
        isCorrect: item.isCorrect,
      }));
      const correctOption = options.find((o) => o.isCorrect)!;

      usedKeys.add(bp.key);
      return {
        id: `q-${stepIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stepNumber: stepIndex + 1,
        promptType,
        expressionForm,
        family: bp.family,
        promptFormula: chosenPrompt,
        options,
        correctId: correctOption.id,
        simplifiedFormula: bp.simplified.formula,
        unsimplifiedFormula: bp.unsimplified.formula,
        termsPreview: correctTerms,
        explanation: bp.explanation,
      };
    } else {
      // promptType === 'numeric' or 'context' -> 4 general term options
      const correctEntry = expressionForm === 'simplified' ? bp.simplified : bp.unsimplified;
      const distractorPool =
        expressionForm === 'simplified' ? bp.simplifiedDistractors : bp.unsimplifiedDistractors;

      // Ensure no two formula options evaluate to the exact same sequence on n=1..5
      // and no two formulas are identical strings
      const seenSigs = new Set<string>([correctSig]);
      const seenFormulas = new Set<string>([correctEntry.formula]);
      const validDistractors: FormulaWithEval[] = [];

      for (const cand of distractorPool) {
        const sig = sequenceSignature(termsOf(cand.evalFn, 1));
        if (!seenSigs.has(sig) && !seenFormulas.has(cand.formula)) {
          seenSigs.add(sig);
          seenFormulas.add(cand.formula);
          validDistractors.push(cand);
        }
        if (validDistractors.length === 3) break;
      }

      if (validDistractors.length < 3) continue;

      const rawOptions: { formula: string; isCorrect: boolean }[] = shuffle([
        { formula: correctEntry.formula, isCorrect: true },
        ...validDistractors.map((d) => ({ formula: d.formula, isCorrect: false })),
      ]);

      const options: SequenceOption[] = rawOptions.map((item, idx) => ({
        id: OPTION_IDS[idx],
        formula: item.formula,
        isCorrect: item.isCorrect,
      }));
      const correctOption = options.find((o) => o.isCorrect)!;

      usedKeys.add(bp.key);
      const ctxBp = promptType === 'context' ? (bp as ContextBlueprint) : null;
      return {
        id: `q-${stepIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stepNumber: stepIndex + 1,
        promptType,
        expressionForm,
        family: bp.family,
        promptTerms: promptType === 'numeric' ? correctTerms : undefined,
        promptContext: ctxBp?.promptContext,
        contextLabel: ctxBp?.contextLabel,
        options,
        correctId: correctOption.id,
        simplifiedFormula: bp.simplified.formula,
        unsimplifiedFormula: bp.unsimplified.formula,
        termsPreview: correctTerms,
        explanation: bp.explanation,
      };
    }
  }

  // Safe fallback (never reached under normal conditions)
  const fallback = buildArithmeticBlueprint();
  const terms = termsOf(fallback.evalFn, 1);
  return {
    id: `q-fallback-${stepIndex}`,
    stepNumber: stepIndex + 1,
    promptType: 'algebraic',
    expressionForm: 'simplified',
    family: 'arithmetic',
    promptFormula: fallback.simplified.formula,
    options: [
      { id: 'A', terms, isCorrect: true },
      { id: 'B', terms: termsOf(fallback.evalFn, 0), isCorrect: false },
      { id: 'C', terms: terms.map((v) => `${Number(v) + 1}`), isCorrect: false },
      { id: 'D', terms: terms.map((v) => `${Number(v) - 2}`), isCorrect: false },
    ],
    correctId: 'A',
    simplifiedFormula: fallback.simplified.formula,
    unsimplifiedFormula: fallback.unsimplified.formula,
    termsPreview: terms,
    explanation: fallback.explanation,
  };
}
