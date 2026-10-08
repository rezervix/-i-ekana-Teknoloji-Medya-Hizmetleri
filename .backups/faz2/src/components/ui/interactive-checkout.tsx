"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ShoppingCart, X, CreditCard, Truck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { requiresOptions, getCardPriceDisplay } from "@/lib/magaza/product-card";

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
    customizationOptions?: any;
    priceMatrix?: any;
    variantDimensions?: any;
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
                image: item.image || "/placeholder.webp",
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

    const recordScroll = () => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem("magaza_scroll_pos", window.scrollY.toString());
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Left Product Grid */}
                <div className="flex-1 w-full">
                    {products.length === 0 ? (
                        <div className="p-12 text-center bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border dark:border-white/10 text-corp-gray dark:text-white/60">
                            Aramanıza veya filtrenize uygun ürün bulunamadı.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                            {products.map((product, index) => {
                                const needsOptions = requiresOptions(product);
                                const priceInfo = getCardPriceDisplay(product);
                                const productUrl = `/magaza/urun/${product.slug || product.id}`;
                                const isPriority = index < 4;

                                return (
                                    <motion.article
                                        key={product.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                                        className={cn(
                                            "group flex flex-col justify-between",
                                            "p-4 rounded-2xl",
                                            "bg-white dark:bg-corp-charcoal",
                                            "border border-corp-border dark:border-white/10",
                                            "hover:border-corp-teal/50 dark:hover:border-teal-400/50",
                                            "shadow-sm hover:shadow-xl",
                                            "transition-all duration-300"
                                        )}
                                    >
                                        {/* Clickable Card Body (Valid HTML Link wrapping visual content) */}
                                        <Link
                                            href={productUrl}
                                            onClick={recordScroll}
                                            className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-corp-teal rounded-xl"
                                        >
                                            {/* Product Image Container */}
                                            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-corp-surface dark:bg-white/5 mb-3.5 border border-corp-border/40 dark:border-white/5">
                                                <Image
                                                    src={product.image || "/placeholder.webp"}
                                                    alt={product.name}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    priority={isPriority}
                                                    loading={isPriority ? undefined : "lazy"}
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                />
                                                {/* Top Badges */}
                                                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                                                    {product.category && (
                                                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-white/95 dark:bg-corp-charcoal/90 backdrop-blur-md text-corp-charcoal dark:text-white shadow-xs border border-corp-border/40 dark:border-white/10 uppercase tracking-wider">
                                                            {product.category}
                                                        </span>
                                                    )}
                                                </div>
                                                {product.freeShipping && (
                                                    <div className="absolute top-2.5 right-2.5 z-10">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-md">
                                                            <Truck className="w-3 h-3" />
                                                            <span>Ücretsiz Kargo</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Text and Details */}
                                            <div className="flex flex-col flex-1">
                                                <h3 className="font-display text-base font-bold text-corp-charcoal dark:text-white group-hover:text-corp-teal dark:group-hover:text-teal-300 transition-colors line-clamp-1 mb-1.5">
                                                    {product.name}
                                                </h3>

                                                {product.description && (
                                                    <p className="text-xs text-corp-gray dark:text-white/60 line-clamp-2 leading-relaxed mb-3">
                                                        {product.description}
                                                    </p>
                                                )}

                                                {/* Price Section */}
                                                <div className="mt-auto pt-2 border-t border-corp-border/40 dark:border-white/5">
                                                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-lg font-extrabold text-corp-teal dark:text-teal-300 font-display">
                                                                {priceInfo.formattedPrice}
                                                            </span>
                                                            {priceInfo.isMatrix && (
                                                                <span className="text-[11px] text-corp-gray dark:text-white/60 font-medium">
                                                                    başlayan
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                                                            {priceInfo.vatNote}
                                                        </span>
                                                    </div>
                                                    {priceInfo.startingText && (
                                                        <p className="text-[11px] text-corp-gray dark:text-white/60 mt-0.5">
                                                            {priceInfo.startingText}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Bottom Action Button (Outside Link to avoid nested <a> or <button>) */}
                                        <div className="mt-4 pt-1">
                                            {needsOptions ? (
                                                <Link
                                                    href={productUrl}
                                                    onClick={recordScroll}
                                                    className={cn(
                                                        "min-h-[44px] w-full",
                                                        "inline-flex items-center justify-center gap-2",
                                                        "rounded-xl",
                                                        "bg-corp-teal/10 hover:bg-corp-teal text-corp-teal hover:text-white",
                                                        "dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-corp-teal dark:hover:text-white",
                                                        "border border-corp-teal/30 dark:border-teal-800/40",
                                                        "font-semibold text-sm transition-all duration-200 shadow-xs",
                                                        "focus:outline-none focus:ring-2 focus:ring-corp-teal"
                                                    )}
                                                >
                                                    <span>Seçenekleri Gör</span>
                                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                                </Link>
                                            ) : (
                                                <Button
                                                    size="default"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(product);
                                                    }}
                                                    className={cn(
                                                        "min-h-[44px] w-full",
                                                        "gap-2 rounded-xl",
                                                        "border-corp-teal/40 text-corp-teal hover:bg-corp-teal hover:text-white",
                                                        "transition-all duration-200 font-semibold text-sm shadow-xs"
                                                    )}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>Sepete Ekle</span>
                                                </Button>
                                            )}
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Sticky Cart Panel */}
                <motion.aside
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                        "w-full lg:w-80 shrink-0 flex flex-col",
                        "p-4 rounded-2xl",
                        "bg-white dark:bg-corp-charcoal",
                        "border border-corp-border dark:border-white/10",
                        "shadow-lg",
                        "lg:sticky lg:top-28",
                        "max-h-[34rem]"
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
                            <div className="py-12 text-center text-corp-gray dark:text-white/50 text-xs">
                                Sepetiniz henüz boş. Ürünleri inceleyerek sepetinize ekleyebilirsiniz.
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
                                                    title="Ürünü sepetten çıkar"
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
                                                        title="Adeti azalt"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </motion.button>
                                                    <motion.span layout className="text-xs font-bold text-corp-charcoal dark:text-white w-5 text-center">
                                                        {item.quantity}
                                                    </motion.span>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-corp-charcoal dark:text-white"
                                                        title="Adeti artır"
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
                            size="default"
                            onClick={handleCheckoutClick}
                            disabled={cart.length === 0}
                            className="min-h-[44px] w-full gap-2 bg-corp-teal hover:bg-corp-teal-600 text-white font-semibold py-2.5 shadow-md disabled:opacity-50 rounded-xl"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Ödemeye Geç</span>
                        </Button>
                    </motion.div>
                </motion.aside>
            </div>
        </div>
    );
}

export { InteractiveCheckout };
export type { Product };
