import { useState, useCallback } from 'react';

/**
 * useCartState — hook reutilizable para la gestión del carrito del POS.
 * Centraliza toda la lógica de carrito y sincronización con localStorage.
 */
export function useCartState() {
    const [cart, setCart] = useState(() => {
        try {
            const stored = localStorage.getItem('cart');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // ── Helpers de persistencia ──────────────────────────────────────────────
    const persist = useCallback((nextCart) => {
        localStorage.setItem('cart', JSON.stringify(nextCart));
        return nextCart;
    }, []);

    // ── Acciones ─────────────────────────────────────────────────────────────

    /**
     * Agrega un producto al carrito.
     * Si ya existe, incrementa la cantidad en 1.
     * @param {object} product - Objeto con campos: id, sku, name, price, discount, empaque, fraccionable, etc.
     * @returns {'added' | 'incremented'} - Tipo de acción realizada.
     */
    const addItem = useCallback((product) => {
        let action = 'added';
        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === product.id);
            let next;
            if (existingIndex >= 0) {
                action = 'incremented';
                next = [...prev];
                next[existingIndex] = {
                    ...next[existingIndex],
                    quantity: next[existingIndex].quantity + 1,
                };
            } else {
                next = [...prev, { ...product, quantity: 1 }];
            }
            return persist(next);
        });
        return action;
    }, [persist]);

    /**
     * Actualiza la cantidad de un item. Si quantity <= 0, elimina el item.
     */
    const updateQuantity = useCallback((id, quantity) => {
        setCart(prev => {
            const next = quantity <= 0
                ? prev.filter(item => item.id !== id)
                : prev.map(item => item.id === id ? { ...item, quantity } : item);
            return persist(next);
        });
    }, [persist]);

    /**
     * Cambia la cantidad en un delta (+1 / -1). No baja de 1.
     */
    const changeQuantity = useCallback((id, delta) => {
        setCart(prev => {
            const next = prev.map(item =>
                item.id === id
                    ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                    : item
            );
            return persist(next);
        });
    }, [persist]);

    /**
     * Elimina un item del carrito por su id.
     */
    const removeItem = useCallback((id) => {
        setCart(prev => persist(prev.filter(item => item.id !== id)));
    }, [persist]);

    /**
     * Vacía el carrito completamente.
     */
    const clearCart = useCallback(() => {
        setCart(persist([]));
    }, [persist]);

    // ── Totales calculados ────────────────────────────────────────────────────
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const descuento = cart.reduce((sum, item) => {
        const valDesc = item.discount > 0 ? (item.price * item.discount / 100) : 0;
        return sum + valDesc * item.quantity;
    }, 0);
    const total = subtotal - descuento;

    return {
        cart,
        addItem,
        updateQuantity,
        changeQuantity,
        removeItem,
        clearCart,
        subtotal,
        descuento,
        total,
    };
}
