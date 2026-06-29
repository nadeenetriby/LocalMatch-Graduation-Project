/** Products without isAvailable are treated as available (backwards compatible). */
export const availableProductFilter = {
  $or: [{ isAvailable: true }, { isAvailable: { $exists: false } }],
};

/** Brands without active are treated as active (backwards compatible). */
export const activeBrandFilter = {
  $or: [{ active: true }, { active: { $exists: false } }],
};

export function mergeAvailabilityFilter(filter = {}) {
  return { $and: [filter, availableProductFilter] };
}
