export type DonationCampaign = {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  deadline: string;
  imageUrl: string;
};

export type DonationInput = {
  amount: number;
  message?: string;
};