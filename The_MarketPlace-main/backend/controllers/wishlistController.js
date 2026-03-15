const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// get wishlist
exports.getWishlist = async (req, res) => {
    try {
        const ownerId = req.user._id;
        let wishlist = await Wishlist.findOne({ ownerId }).populate({
            path: 'items.productId',
            match: { status: { $ne: 'deleted' } }
        });
        if (wishlist) {
            // remove null entries (where product was deleted)
            wishlist.items = wishlist.items.filter(i => i.productId);
        }
        if (!wishlist) {
            wishlist = new Wishlist({ ownerId, items: [] });
            await wishlist.save();
        }
        res.json(wishlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
};

// toggle wishlist item
exports.toggleWishlist = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const { productId } = req.body;
        if (!productId) return res.status(400).json({ error: 'productId required' });

        let wishlist = await Wishlist.findOne({ ownerId });
        if (!wishlist) wishlist = new Wishlist({ ownerId, items: [] });

        const idx = wishlist.items.findIndex(i => i.productId.toString() === productId.toString());
        if (idx > -1) {
            // remove
            wishlist.items.splice(idx, 1);
        } else {
            // add
            const product = await Product.findById(productId);
            if (!product) return res.status(404).json({ error: 'Product not found' });
            wishlist.items.push({ productId });
        }

        wishlist.updatedAt = new Date();
        await wishlist.save();
        res.json({ ok: true, wishlist });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Wishlist update failed' });
    }
};

// clear wishlist
exports.clearWishlist = async (req, res) => {
    try {
        await Wishlist.deleteOne({ ownerId: req.user._id });
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed' });
    }
};
