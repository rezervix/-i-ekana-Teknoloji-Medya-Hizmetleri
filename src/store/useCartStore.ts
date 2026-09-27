import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemType {
  id: string; // generate a random ID for guest cart
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
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
  isOpen: boolean;
  addItem: (item: Omit<CartItemType, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item) => {
        set((state) => {
          // Check if same item with same customizations exists
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === item.productId && JSON.stringify(i.customizationData) === JSON.stringify(item.customizationData)
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += item.quantity;
            return { items: newItems, isOpen: true }; // open drawer on add
          }

          return {
            items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }],
            isOpen: true,
          };
        });
      },
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
      })),
      clearCart: () => set({ items: [] }),
      toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
    }),
    {
      name: 'magaza-cart',
    }
  )
);
