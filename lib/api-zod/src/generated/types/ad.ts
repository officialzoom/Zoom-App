export type Ad = {
  id: string;
  title: string;
  description: string;
  amount: number;
  imageUrl: string;
  createdAt: string;
};

export type AdInput = {
  title: string;
  description: string;
  amount: number;
  imageUrl: string;
};

export type AdStatus = 'active' | 'expired' | 'paused';