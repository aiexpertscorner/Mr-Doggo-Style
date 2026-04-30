// Claim replacement rules — editorial safety guardrails for PupWiki content
export const CLAIM_RULES = [
  { pattern: /vet[- ]guided/gi,              suggestion: 'Research-Based',      risk: 'high' },
  { pattern: /vet[- ]approved/gi,            suggestion: 'Vet-Reviewed',        risk: 'high' },
  { pattern: /veterinarian[- ]approved/gi,   suggestion: 'Vet-Reviewed',        risk: 'high' },
  { pattern: /we tested/gi,                  suggestion: 'We compared',         risk: 'medium' },
  { pattern: /expert picks/gi,               suggestion: "Editor's Picks",       risk: 'medium' },
  { pattern: /best .{0,30} guaranteed/gi,    suggestion: 'Remove guarantee',    risk: 'high' },
  { pattern: /clinically proven/gi,          suggestion: 'Remove claim',        risk: 'high' },
  { pattern: /guaranteed cheapest/gi,        suggestion: 'Remove claim',        risk: 'high' },
  { pattern: /scientifically proven/gi,      suggestion: 'Remove claim',        risk: 'high' },
  { pattern: /cure[sd]?\b/gi,               suggestion: 'may help manage',     risk: 'high' },
  { pattern: /treat[s]? [a-z ]{0,20}disease/gi, suggestion: 'may support',     risk: 'high' },
  { pattern: /no[- ]side[- ]effects/gi,     suggestion: 'Remove claim',        risk: 'high' },
  { pattern: /100%\s*(natural|safe|organic)/gi, suggestion: 'naturally sourced', risk: 'medium' },
];
