export const UNSAFE_CLAIM_REPLACEMENTS = [
  [/Vet[- ]Guided/gi, 'Research-Based'],
  [/Vet[- ]Tested/gi, 'Research-Based'],
  [/Vet[- ]Approved/gi, 'Research-Based'],
  [/Vet[- ]Recommended/gi, 'Fit Signal'],
  [/We tested/gi, 'We compared'],
  [/tested 30\+ formulas/gi, 'compared 30+ formulas'],
  [/Expert Tips/gi, 'Practical Tips'],
  [/Expert Picks/gi, "Editor's Picks"],
  [/strong vet backing/gi, 'clear product positioning and broad availability'],
  [/clinical evidence/gi, 'commonly discussed in veterinary and product guidance'],
  [/Diet directly impacts progression/gi, 'Diet, body condition, and portion control may influence comfort and long-term wellbeing'],
  [/reduce risk/gi, 'may help support healthier outcomes'],
  [/prevents disease/gi, 'may support overall wellbeing'],
  [/treats disease/gi, 'is commonly positioned for supportive care'],
  [/cures/gi, 'supports'],
  [/clinically proven/gi, 'widely used'],
  [/guaranteed cheapest/gi, 'competitively priced'],
  [/no[- ]side[- ]effects/gi, 'generally well-tolerated'],
  [/100%\s*(natural|safe|organic)/gi, 'naturally sourced'],
];

export const HIGH_RISK_CATEGORIES = ['Health', 'Supplements', 'Supplement'];

export const FOOD_DISCLAIMER = `> **Health note:** This guide is for general informational and product-comparison purposes only. It is not veterinary advice. Diet, allergies, medical conditions, and weight-management plans should be discussed with your veterinarian, especially for puppies, seniors, dogs with chronic conditions, or breeds with known health risks.`;

export const SUPPLEMENT_DISCLAIMER = `> **Supplement safety note:** Supplements are not a replacement for veterinary care and may not be appropriate for every dog. Always check with your veterinarian before adding supplements, especially if your dog is pregnant, senior, taking medication, or has a diagnosed health condition.`;

export function sanitizeClaims(input = '') {
  let output = String(input);
  for (const [pattern, replacement] of UNSAFE_CLAIM_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}
