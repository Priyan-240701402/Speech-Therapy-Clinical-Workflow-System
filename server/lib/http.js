export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const parsePagination = (req, defaults = {}) => {
  const defaultLimit = Number.isFinite(Number(defaults.limit))
    ? Number(defaults.limit)
    : 20;
  const maxLimit = Number.isFinite(Number(defaults.maxLimit))
    ? Number(defaults.maxLimit)
    : 100;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(req.query.limit) || defaultLimit, 1),
    maxLimit
  );
  const offset = Math.max(Number(req.query.offset) || (page - 1) * limit, 0);
  return { limit, offset, page };
};
