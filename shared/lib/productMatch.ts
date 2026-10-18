// §18.3: fuzzy-matches an AI-extracted line item description against the
// product catalog. Forward pass scores +2 per catalog word found in the
// description; reverse pass scores +1 per description word found in the
// catalog name. Requires score >= 2 to count as a match at all — an
// unmatched item should stay unmatched, not get a wrong guess.
export interface MatchableProduct {
  id: number;
  name: string;
}

export function findBestMatch<T extends MatchableProduct>(description: string, products: T[]): T | null {
  const descLower = description.toLowerCase();
  const words = descLower.split(/\s+/).filter((w) => w.length > 2);

  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const product of products) {
    const name = product.name.toLowerCase();
    let score = 0;

    for (const word of words) {
      if (name.includes(word)) score += 2;
    }
    for (const word of name.split(/\s+/)) {
      if (word.length > 2 && descLower.includes(word)) score += 1;
    }

    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = product;
    }
  }

  return bestMatch;
}
