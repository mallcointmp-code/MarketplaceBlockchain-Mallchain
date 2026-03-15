async function advancedSearch(model, searchFields, searchTerm, filter = {}, options = {}) {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const skip = (page - 1) * limit;

  const searchQuery = searchTerm
    ? {
        $or: searchFields.map(field => ({
          [field]: { $regex: searchTerm, $options: "i" }
        }))
      }
    : {};

  const docs = await model.find({ ...filter, ...searchQuery }).skip(skip).limit(limit);
  const total = await model.countDocuments({ ...filter, ...searchQuery });

  return {
    data: docs,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

module.exports = advancedSearch;