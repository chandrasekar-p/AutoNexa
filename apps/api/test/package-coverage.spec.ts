import { isLabourCoveredByPackage, isPartCoveredByPackage, PackageInclusions } from '../src/modules/service-packages/package-coverage';

const inclusions: PackageInclusions = {
  labourItemIds: new Set(['labour-1']),
  partIds: new Set(['part-1']),
  partCategoryIds: new Set(['category-1']),
};

describe('isLabourCoveredByPackage', () => {
  it('covers a labour item explicitly included in the package', () => {
    expect(isLabourCoveredByPackage('labour-1', inclusions)).toBe(true);
  });

  it('does not cover a labour item outside the package', () => {
    expect(isLabourCoveredByPackage('labour-2', inclusions)).toBe(false);
  });

  it('does not cover a job-card line with no labourItemId at all', () => {
    expect(isLabourCoveredByPackage(null, inclusions)).toBe(false);
  });
});

describe('isPartCoveredByPackage', () => {
  it('covers a part explicitly included by id', () => {
    expect(isPartCoveredByPackage('part-1', null, inclusions)).toBe(true);
  });

  it('covers any part in an included category, even if the part id itself is not listed', () => {
    expect(isPartCoveredByPackage('part-99', 'category-1', inclusions)).toBe(true);
  });

  it('does not cover a part that is neither individually listed nor in a covered category', () => {
    expect(isPartCoveredByPackage('part-99', 'category-99', inclusions)).toBe(false);
  });

  it('does not cover an uncategorized part unless individually listed', () => {
    expect(isPartCoveredByPackage('part-99', null, inclusions)).toBe(false);
  });
});
