import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemType {
  id: string; // generate a random ID for guest cart
  productId: string;
  itemType?: "product" | "subscription";
  subscriptionPlanId?: string;
  subscriptionTierId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  freeShipping?: boolean;
  customizationData?: any;
  category?: string;
  extraServices?: {
    type: string;
    label: string;
    price: number;
  }[];
  selectedDesignTemplateId?: string;
  selectedDesignTemplateName?: string;
}

interface CartStore {
  items: CartItemType[];
  savedForLater: CartItemType[];
  couponCode: string | null;
  isOpen: boolean;
  addItem: (item: Omit<CartItemType, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  saveForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  removeSavedItem: (id: string) => void;
  setCouponCode: (code: string | null) => void;
  clearCart: () => void;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  syncWithServer: () => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      savedForLater: [],
      couponCode: null,
      isOpen: false,
      addItem: (item) => {
        set((state) => {
          // Check if same item with same customizations exists
          const existingItemIndex = state.items.findIndex(
            (i) =>
              i.productId === item.productId &&
              JSON.stringify(i.customizationData) ===
                JSON.stringify(item.customizationData)
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += item.quantity;
            return { items: newItems, isOpen: true }; // open drawer on add
          }

          return {
            items: [
              ...state.items,
              { ...item, id: Math.random().toString(36).substring(7) },
            ],
            isOpen: true,
          };
        });
      },
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        } else {
          set((state) => ({
            items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
          }));
        }
      },
      saveForLater: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
          savedForLater: [...state.savedForLater, item],
        }));
      },
      moveToCart: (id) => {
        const item = get().savedForLater.find((i) => i.id === id);
        if (!item) return;
        set((state) => ({
          savedForLater: state.savedForLater.filter((i) => i.id !== id),
          items: [...state.items, item],
        }));
      },
      removeSavedItem: (id) =>
        set((state) => ({
          savedForLater: state.savedForLater.filter((i) => i.id !== id),
        })),
      setCouponCode: (code) => set({ couponCode: code }),
      clearCart: () => set({ items: [], couponCode: null }),
      toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      syncWithServer: async () => {
        try {
          const items = get().items;
          if (items.length === 0) return;
          await fetch("/api/cart/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
        } catch {
          // Non-blocking sync
        }
      },
    }),
    {
      name: 'magaza-cart',
    }
  )
);
