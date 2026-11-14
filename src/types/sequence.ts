export type OptionId = 'A' | 'B' | 'C' | 'D';

export type PromptType = 'algebraic' | 'numeric' | 'context';

export type ExpressionForm = 'simplified' | 'unsimplified';

export type SequenceFamily = 'arithmetic' | 'geometric' | 'quadratic' | 'fractional';

export type TopicFilter = 'all' | 'arithmetic' | 'geometric_quadratic' | 'context';

export interface SequenceOption {
  id: OptionId;
  /** Algebraic formula string (used when promptType === 'numeric' or 'context') */
  formula?: string;
  /** First 5 terms formatted as math strings (used when promptType === 'algebraic') */
  terms?: string[];
  isCorrect: boolean;
}

export interface SequenceQuestion {
  id: string;
  stepNumber: number;
  promptType: PromptType;
  expressionForm: ExpressionForm;
  family: SequenceFamily;
  /** Displayed on stage when promptType === 'algebraic' */
  promptFormula?: string;
  /** Displayed on stage when promptType === 'numeric' */
  promptTerms?: string[];
  /** Displayed on stage when promptType === 'context' */
  promptContext?: string;
  /** Short domain label for contextual problems (e.g., "Teatre", "Estalvi") */
  contextLabel?: string;
  options: SequenceOption[];
  correctId: OptionId;
  /** Concise simplified formula for classroom explanation after reveal */
  simplifiedFormula: string;
  /** Concise unsimplified formula if relevant */
  unsimplifiedFormula?: string;
  /** Exact first 5 terms stringified */
  termsPreview: string[];
  /** Crisp 1-line Catalan explanation shown after checking */
  explanation: string;
}

export interface SessionEntry {
  question: SequenceQuestion;
  selectedOptionId: OptionId | null;
  revealed: boolean;
  wasCorrect: boolean | null;
}
