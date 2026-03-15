export const STORAGE_KEYS = {
    CART: 'cart',
    WISHLIST: 'wishlist'
};

export function getStorageKey(key: string, userId?: string | null): string {
    if (userId) {
        return `${key}_${userId}`;
    }
    return key; // Fallback for guest
}

export function getCart(userId?: string | null): any[] {
    try {
        const key = getStorageKey(STORAGE_KEYS.CART, userId);
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        console.error('Error reading cart', e);
        return [];
    }
}

export function setCart(items: any[], userId?: string | null): void {
    try {
        const key = getStorageKey(STORAGE_KEYS.CART, userId);
        localStorage.setItem(key, JSON.stringify(items));
        window.dispatchEvent(new Event('cart-updated'));
    } catch (e) {
        console.error('Error saving cart', e);
    }
}

export function getWishlist(userId?: string | null): any[] {
    try {
        const key = getStorageKey(STORAGE_KEYS.WISHLIST, userId);
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        console.error('Error reading wishlist', e);
        return [];
    }
}

export function setWishlist(items: any[], userId?: string | null): void {
    try {
        const key = getStorageKey(STORAGE_KEYS.WISHLIST, userId);
        localStorage.setItem(key, JSON.stringify(items));
        window.dispatchEvent(new Event('wishlist-updated'));
    } catch (e) {
        console.error('Error saving wishlist', e);
    }
}

export function addToCart(item: any, userId?: string | null): void {
    const cart = getCart(userId);
    const existing = cart.find((p: any) => p.id === item.id || p._id === item.id);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    } else {
        cart.push({ ...item, quantity: item.quantity || 1 });
    }
    setCart(cart, userId);
}

export function addToWishlist(item: any, userId?: string | null): boolean {
    const wishlist = getWishlist(userId);
    const exists = wishlist.some((p: any) => p.id === item.id || p._id === item.id);
    if (!exists) {
        wishlist.push(item);
        setWishlist(wishlist, userId);
        return true;
    }
    return false;
}

export function removeFromWishlist(itemId: string, userId?: string | null): void {
    const wishlist = getWishlist(userId);
    const newWishlist = wishlist.filter((p: any) => p.id !== itemId && p._id !== itemId);
    setWishlist(newWishlist, userId);
}
