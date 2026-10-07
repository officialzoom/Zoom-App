export type Ad = {
  id: string;
  title: string;
  description: string;
  amount: number;
  imageUrl: string;
  createdAt: string;
};

// AdInput and AdStatus are exported from their own dedicated files
// (adInput.ts, adStatus.ts) to avoid duplicate export conflicts.