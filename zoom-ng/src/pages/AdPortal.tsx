import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import { useGetAds, useGetDonationCampaigns, useSubmitAd, useMakeDonation, getGetAdsQueryKey, getGetDonationCampaignsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatting";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Megaphone, Heart, PlusCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdPortal() {
  const { data: ads, isLoading: adsLoading } = useGetAds();
  const { data: campaigns, isLoading: campaignsLoading } = useGetDonationCampaigns();
  
  const submitAd = useSubmitAd();
  const makeDonation = useMakeDonation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [adForm, setAdForm] = useState({ title: "", audience: "all", duration: "1week", targetUrl: "" });
  const [donationAmount, setDonationAmount] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  const adCost = adForm.duration === "1week" ? 50000 : adForm.duration === "1month" ? 180000 : 500000;

  const handleAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adForm.title) { toast({ title: "Title required", variant: "destructive" }); return; }

    submitAd.mutate({
      data: { ...adForm, cost: adCost }
    }, {
      onSuccess: () => {
        toast({ title: "Ad campaign submitted successfully!" });
        setIsAdOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetAdsQueryKey() });
      }
    });
  };

  const handleDonationSubmit = () => {
    if (!selectedCampaign || !donationAmount || isNaN(Number(donationAmount))) return;

    makeDonation.mutate({
      campaignId: selectedCampaign,
      data: { amount: Number(donationAmount) }
    }, {
      onSuccess: () => {
        toast({ title: "Donation successful!", description: "Thank you for your generosity." });
        setIsDonationOpen(false);
        setDonationAmount("");
        queryClient.invalidateQueries({ queryKey: getGetDonationCampaignsQueryKey() });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      
      <main className="container mx-auto px-4 pt-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="ads" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100/50 p-1 rounded-2xl">
              <TabsTrigger value="ads" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 font-semibold text-base">
                <Megaphone className="w-5 h-5 mr-2" /> My Campaigns
              </TabsTrigger>
              <TabsTrigger value="donations" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 font-semibold text-base">
                <Heart className="w-5 h-5 mr-2" /> Support Causes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ads">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Advertising Portal</h2>
                  <p className="text-muted-foreground">Reach thousands of Zoom NG investors</p>
                </div>
                
                <Dialog open={isAdOpen} onOpenChange={setIsAdOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl font-bold h-12 px-6 shadow-md shadow-primary/20">
                      <PlusCircle className="w-5 h-5 mr-2" /> New Campaign
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-3xl p-6">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold">Create Ad Campaign</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Campaign Title</Label>
                        <Input 
                          value={adForm.title} 
                          onChange={e => setAdForm({...adForm, title: e.target.value})} 
                          placeholder="e.g. Real Estate Promo" 
                          className="h-12 rounded-xl bg-gray-50 border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target URL</Label>
                        <Input 
                          value={adForm.targetUrl} 
                          onChange={e => setAdForm({...adForm, targetUrl: e.target.value})} 
                          placeholder="https://" 
                          className="h-12 rounded-xl bg-gray-50 border-gray-200"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Audience</Label>
                          <Select value={adForm.audience} onValueChange={v => setAdForm({...adForm, audience: v})}>
                            <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="gold">Gold Investors</SelectItem>
                              <SelectItem value="new">New Users</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Select value={adForm.duration} onValueChange={v => setAdForm({...adForm, duration: v})}>
                            <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1week">1 Week</SelectItem>
                              <SelectItem value="1month">1 Month</SelectItem>
                              <SelectItem value="3months">3 Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="bg-primary/10 p-4 rounded-xl mt-6 flex justify-between items-center">
                        <span className="font-semibold">Total Cost</span>
                        <span className="text-xl font-bold text-foreground">{formatCurrency(adCost)}</span>
                      </div>
                      <Button type="submit" disabled={submitAd.isPending} className="w-full h-14 rounded-xl font-bold text-lg mt-2">
                        {submitAd.isPending ? "Submitting..." : "Submit Campaign"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {adsLoading ? (
                  [1,2].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse"></div>)
                ) : ads?.length ? (
                  ads.map(ad => (
                    <div key={ad.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">{ad.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            ad.status === 'active' ? 'bg-green-100 text-green-700' :
                            ad.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'
                          }`}>{ad.status}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Target: {ad.audience} • Duration: {ad.duration}</p>
                      </div>
                      <div className="text-right sm:border-l sm:pl-6 border-gray-100">
                        <p className="text-sm text-muted-foreground mb-1">Cost</p>
                        <p className="font-bold text-lg">{formatCurrency(ad.cost)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                    <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold">No active campaigns</h3>
                    <p className="text-muted-foreground">Create your first ad campaign to reach more users.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="donations">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Support Causes</h2>
                <p className="text-muted-foreground">Donate part of your returns to verified initiatives</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {campaignsLoading ? (
                  [1,2].map(i => <div key={i} className="h-64 bg-white rounded-3xl animate-pulse"></div>)
                ) : campaigns?.map(campaign => {
                  const progress = Math.min((campaign.raisedAmount / campaign.targetAmount) * 100, 100);
                  
                  return (
                    <div key={campaign.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${campaign.color}20`, color: campaign.color }}>
                        <Heart className="w-6 h-6 fill-current" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">{campaign.title}</h3>
                      <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{campaign.description}</p>
                      
                      <div className="mt-auto">
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-foreground">{formatCurrency(campaign.raisedAmount)}</span>
                          <span className="text-muted-foreground">Goal: {formatCurrency(campaign.targetAmount)}</span>
                        </div>
                        <Progress value={progress} className="h-2.5 mb-6 bg-gray-100" />
                        
                        <Dialog open={isDonationOpen && selectedCampaign === campaign.id} onOpenChange={(open) => {
                          setIsDonationOpen(open);
                          if(open) setSelectedCampaign(campaign.id);
                          else setSelectedCampaign(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button className="w-full rounded-xl h-12 font-bold" variant="outline">Support Cause</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md rounded-3xl p-6">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold text-center">Support {campaign.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 mt-4">
                              <div className="space-y-2 text-center">
                                <Label className="text-lg">Amount to Donate</Label>
                                <Input 
                                  type="number" 
                                  value={donationAmount} 
                                  onChange={e => setDonationAmount(e.target.value)} 
                                  className="h-16 text-center text-3xl font-bold rounded-2xl bg-gray-50 border-none"
                                  placeholder="0"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {[1000, 5000, 10000].map(amt => (
                                  <Button key={amt} variant="outline" className="rounded-xl h-12 font-semibold" onClick={() => setDonationAmount(amt.toString())}>
                                    ₦{amt/1000}k
                                  </Button>
                                ))}
                              </div>
                              <Button 
                                onClick={handleDonationSubmit} 
                                disabled={makeDonation.isPending || !donationAmount}
                                className="w-full h-14 rounded-xl font-bold text-lg mt-2 shadow-lg shadow-primary/20"
                              >
                                {makeDonation.isPending ? "Processing..." : "Confirm Donation"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}