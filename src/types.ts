export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  price: number;
  image: string;
  description: string;
  is_available: number;
}

export interface CartItem extends Product {
  quantity: number;
}
