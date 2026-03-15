async function paginate(model, query = {}, options = {}) {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const sort = options.sort || { createdAt: -1 };
  const filter = options.filter || {};

  const skip = (page - 1) * limit;
  const docs = await model.find({ ...query, ...filter }).sort(sort).skip(skip).limit(limit);
  const total = await model.countDocuments({ ...query, ...filter });

  return {
    data: docs,
    meta: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

module.exports = paginate;