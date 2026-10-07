export type DonationCampaign = {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  deadline: string;
  imageUrl: string;
};

// DonationInput is exported from its own dedicated file (donationInput.ts)
// to avoid duplicate export conflicts.