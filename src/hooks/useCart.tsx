import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const productStock = await api.get(`/stock/${productId}`).then(response => response.data);
      const productInCart: Product | undefined = cart.find((product) => product.id === productId);

      if(productStock.amount === 0 || (productInCart && productStock.amount <= productInCart.amount)) {
        toast.error('Quantidade solicitada fora de estoque');
      }
      else if(productInCart) {
        const newCart = cart.map(product => {
          if(product.id === productInCart.id) {
            return {
              id: product.id,
              title: product.title,
              image: product.image,
              amount: product.amount + 1,
              price: product.price,
            }
          }
          return product;
        });

        setCart(newCart);
      } else {
        const product = await api.get(`/products/${productId}`).then(response => response.data);
        setCart([...cart, { ...product, amount: 1 }]);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock = await api.get(`/stock/${productId}`).then(response => response.data);
      const productInCart: Product | undefined = cart.find((product) => product.id === productId);

      if(productInCart){
        if(productInCart.amount + amount >= 1 && productInCart.amount + amount <= productStock.amount) {
          const newCart = cart.map(product => {
            if(product.id === productInCart.id) {
              return {
                ...productInCart,
                amount: productInCart.amount + amount
              };
            }

            return product;
          });

          setCart(newCart);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
