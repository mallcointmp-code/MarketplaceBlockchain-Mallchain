async function cursorPaginate(model, query = {}, options = {}) {
  const limit = parseInt(options.limit) || 20;
  const sortField = options.sortField || "_id";
  const sortOrder = options.sortOrder || -1;
  const cursor = options.cursor;

  const filter = { ...query };
  if (cursor) {
    filter[sortField] = sortOrder === -1
      ? { $lt: cursor }
      : { $gt: cursor };
  }

  const docs = await model.find(filter)
    .sort({ [sortField]: sortOrder })
    .limit(limit);

  const nextCursor = docs.length ? docs[docs.length - 1][sortField] : null;

  return {
    data: docs,
    meta: {
      limit,
      nextCursor,
      hasMore: docs.length === limit
    }
  };
}

module.exports = cursorPaginate;