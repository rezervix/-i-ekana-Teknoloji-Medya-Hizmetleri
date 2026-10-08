"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ShoppingCart, X, CreditCard, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    image: string;
    color?: string;
    description?: string;
    slug?: string;
    freeShipping?: boolean;
}

interface CartItem extends Product {
    quantity: number;
}

interface InteractiveCheckoutProps {
    products: Product[];
    onCheckout?: () => void;
}

function InteractiveCheckout({ products, onCheckout }: InteractiveCheckoutProps) {
    const router = useRouter();
    const { items: globalCartItems, addItem, removeItem: removeGlobalItem, updateQuantity: updateGlobalQuantity } = useCartStore();

    // Local cart state for instant interactive reactivity
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        if (globalCartItems && globalCartItems.length > 0) {
            const mapped = globalCartItems.map((item) => ({
                id: item.productId || item.id,
                name: item.name,
                price: item.price,
                category: item.category || "Baskı & Reklam",
                image: item.image || "https://images.unsplash.com/photo-1589008272911-3091e0a81665?w=800",
                color: "Standart",
                quantity: item.quantity,
            }));
            setCart(mapped);
        }
    }, [globalCartItems]);

    const addToCart = (product: Product) => {
        // Synchronize with global store
        addItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image,
            category: product.category,
        });

        // Update local cart state
        setCart((currentCart) => {
            const existingItem = currentCart.find((item) => item.id === product.id);
            if (existingItem) {
                return currentCart.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...currentCart, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        const storeItem = globalCartItems.find(i => i.productId === productId || i.id === productId);
        if (storeItem) {
            removeGlobalItem(storeItem.id);
        }
        setCart((currentCart) => currentCart.filter((item) => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            const newQuantity = existingItem.quantity + delta;
            const storeItem = globalCartItems.find(i => i.productId === productId || i.id === productId);
            
            if (newQuantity <= 0) {
                if (storeItem) removeGlobalItem(storeItem.id);
                setCart((currentCart) => currentCart.filter((item) => item.id !== productId));
            } else {
                if (storeItem) updateGlobalQuantity(storeItem.id, newQuantity);
                setCart((currentCart) =>
                    currentCart.map((item) =>
                        item.id === productId ? { ...item, quantity: newQuantity } : item
                    )
                );
            }
        }
    };

    const handleCheckoutClick = () => {
        if (onCheckout) {
            onCheckout();
        } else {
            router.push("/magaza/odeme");
        }
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Product List */}
                <div className="flex-1 space-y-3">
                    {products.map((product) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "group",
                                "p-4 rounded-xl",
                                "bg-white dark:bg-corp-charcoal",
                                "border border-corp-border dark:border-white/10",
                                "hover:border-corp-teal/40 dark:hover:border-white/20",
                                "shadow-sm hover:shadow-md",
                                "transition-all duration-200"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "relative w-14 h-14 rounded-lg overflow-hidden shrink-0",
                                            "bg-corp-surface dark:bg-white/10",
                                            "transition-colors duration-200",
                                            "group-hover:bg-gray-200 dark:group-hover:bg-white/15"
                                        )}
                                    >
                                        <Image
                                            src={product.image || "https://images.unsplash.com/photo-1589008272911-3091e0a81665?w=800"}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-corp-charcoal dark:text-white font-display">
                                                {product.name}
                                            </h3>
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-corp-teal/10 dark:bg-white/10 text-corp-teal dark:text-teal-300">
                                                {product.category}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-corp-gray dark:text-white/60 mt-1">
                                            <span className="font-semibold text-corp-charcoal dark:text-white">{product.price.toLocaleString("tr-TR")} ₺</span>
                                            <span>•</span>
                                            <span>{product.color || "Standart Baskı"}</span>
                                        </div>
                                        {product.freeShipping && (
                                            <div className="mt-1.5 flex items-center">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
                                                    <Truck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                    <span>Ücretsiz Kargo</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addToCart(product)}
                                    className="gap-1.5 border-corp-teal/30 text-corp-teal hover:bg-corp-teal hover:text-white transition-all font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Ekle
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Right Sticky Cart Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                        "w-full md:w-80 flex flex-col",
                        "p-4 rounded-xl",
                        "bg-white dark:bg-corp-charcoal",
                        "border border-corp-border dark:border-white/10",
                        "shadow-lg",
                        "md:sticky md:top-28",
                        "max-h-[32rem]"
                    )}
                >
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-corp-border dark:border-white/10">
                        <ShoppingCart className="w-4 h-4 text-corp-teal dark:text-teal-300" />
                        <h2 className="text-sm font-bold text-corp-charcoal dark:text-white font-display">
                            Sepet ({totalItems})
                        </h2>
                    </div>

                    <motion.div className={cn("flex-1 overflow-y-auto", "min-h-0", "-mx-4 px-4", "space-y-3")}>
                        {cart.length === 0 ? (
                            <div className="py-10 text-center text-corp-gray dark:text-white/50 text-xs">
                                Sepetiniz henüz boş. Sol taraftan ürün ekleyebilirsiniz.
                            </div>
                        ) : (
                            <AnimatePresence initial={false} mode="popLayout">
                                {cart.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ opacity: { duration: 0.2 }, layout: { duration: 0.2 } }}
                                        className={cn(
                                            "flex items-center gap-3",
                                            "p-2.5 rounded-lg",
                                            "bg-corp-surface dark:bg-white/5",
                                            "border border-corp-border/60 dark:border-white/5",
                                            "mb-3"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-corp-charcoal dark:text-white truncate">
                                                    {item.name}
                                                </span>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-corp-gray hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </motion.button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <div className="flex items-center gap-1 bg-white dark:bg-white/10 rounded-md p-0.5 border border-corp-border dark:border-white/10">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-corp-charcoal dark:text-white"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </motion.button>
                                                    <motion.span layout className="text-xs font-bold text-corp-charcoal dark:text-white w-4 text-center">
                                                        {item.quantity}
                                                    </motion.span>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-corp-charcoal dark:text-white"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </motion.button>
                                                </div>
                                                <motion.span layout className="text-xs font-bold text-corp-teal dark:text-teal-300">
                                                    {(item.price * item.quantity).toLocaleString("tr-TR")} ₺
                                                </motion.span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </motion.div>
                    <motion.div layout className={cn("pt-3 mt-3", "border-t border-corp-border dark:border-white/10", "bg-white dark:bg-corp-charcoal")}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-corp-gray dark:text-white/60">Toplam Tutar</span>
                            <motion.span layout className="text-base font-bold text-corp-charcoal dark:text-white font-display">
                                <NumberFlow value={totalPrice} format={{ style: "currency", currency: "TRY", maximumFractionDigits: 0 }} />
                            </motion.span>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleCheckoutClick}
                            disabled={cart.length === 0}
                            className="w-full gap-2 bg-corp-teal hover:bg-corp-teal-600 text-white font-semibold py-2.5 shadow-md disabled:opacity-50"
                        >
                            <CreditCard className="w-4 h-4" />
                            Ödemeye Geç
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}

export { InteractiveCheckout };
export type { Product };
