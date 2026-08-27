import { describe, it, expect } from 'vitest';
import {
  GRADED_BOOKS_LIBRARY,
  analyzeBookCoverage,
  generateSubBookFromKnownChars,
} from '../GradedBookEngine';

describe('GradedBookEngine', () => {
  it('should have predefined graded books across level 1 to 3', () => {
    expect(GRADED_BOOKS_LIBRARY.length).toBeGreaterThanOrEqual(5);
    const l1Books = GRADED_BOOKS_LIBRARY.filter((b) => b.level === 1);
    const l2Books = GRADED_BOOKS_LIBRARY.filter((b) => b.level === 2);
    const l3Books = GRADED_BOOKS_LIBRARY.filter((b) => b.level === 3);

    expect(l1Books.length).toBeGreaterThan(0);
    expect(l2Books.length).toBeGreaterThan(0);
    expect(l3Books.length).toBeGreaterThan(0);
  });

  it('should correctly analyze book coverage with known characters', () => {
    const book = GRADED_BOOKS_LIBRARY[0]!;
    // 假设只掌握了其中几个字
    const knownChars = ['日', '月', '天', '山', '大'];
    const result = analyzeBookCoverage(book, knownChars);

    expect(result.bookId).toBe(book.id);
    expect(result.knownCount).toBeGreaterThan(0);
    expect(result.totalUniqueChars).toBeGreaterThan(0);
    expect(result.coverageRate).toBeGreaterThan(0);
    expect(result.coverageRate).toBeLessThanOrEqual(1);
  });

  it('should mark canReadIndependently as true when coverage is >= 85%', () => {
    const book = GRADED_BOOKS_LIBRARY[0]!;
    // 传入全部汉字
    const fullText = book.pages.map((p) => p.text).join('');
    const allChars = Array.from(new Set(fullText.match(/[\u4e00-\u9fa5]/g) || []));

    const result = analyzeBookCoverage(book, allChars);
    expect(result.coverageRate).toBe(1);
    expect(result.canReadIndependently).toBe(true);
    expect(result.recommendStatus).toBe('perfect');
  });

  it('should generate sub-book strictly matching known characters', () => {
    const knownChars = ['日', '月', '天', '大', '山', '水'];
    const customBook = generateSubBookFromKnownChars(knownChars, 'nature');

    expect(customBook.id).toContain('custom-subbook');
    expect(customBook.pages.length).toBe(3);
    expect(customBook.quiz.question).toBeDefined();
    expect(customBook.quiz.options.length).toBe(3);
  });
});
