import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import { useGetAssets } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/formatting";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateInvestment, getGetInvestmentsQueryKey, getGetWalletQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

const VEHICLE_CATALOG: Record<string, { name: string; images: string[]; desc: string; specs: string }[]> = {
  car: [
    { name: "Toyota Camry 2020", images: ["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&q=80", "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80"], desc: "Reliable sedan for ride-hailing services. High demand in Lagos & Abuja.", specs: "2.5L 4-cyl • Auto • 35 MPG" },
    { name: "Honda Accord 2021", images: ["https://images.unsplash.com/photo-1617531653332-bd46c16f4d68?w=600&q=80", "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80"], desc: "Premium sedan delivering excellent returns from corporate hire.", specs: "1.5L Turbo • CVT • 38 MPG" },
    { name: "Kia Rio 2022", images: ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=80", "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80"], desc: "Economy sedan, perfect for urban ride-sharing in Nigerian cities.", specs: "1.4L 4-cyl • Manual • 40 MPG" },
    { name: "Toyota Corolla 2021", images: ["https://images.unsplash.com/photo-1623005329960-3ce60d11e46b?w=600&q=80", "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=600&q=80"], desc: "Nigeria's most popular ride-hailing car — always in demand.", specs: "1.8L 4-cyl • Auto • 32 MPG" },
    { name: "Hyundai Elantra 2022", images: ["https://images.unsplash.com/photo-1568844293986-ca9f5b2caa89?w=600&q=80", "https://images.unsplash.com/photo-1542362567-b07e54358753?w=600&q=80"], desc: "Modern compact sedan with low maintenance costs.", specs: "2.0L 4-cyl • Auto • 36 MPG" },
    { name: "Toyota Venza 2020", images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80", "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80"], desc: "Executive SUV serving premium airport transfers and corporate clients.", specs: "2.7L V6 • Auto • 28 MPG" },
  ],
  bus: [
    { name: "Toyota HiAce 2021", images: ["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80", "https://images.unsplash.com/photo-1569335645895-acb22b6de14f?w=600&q=80"], desc: "High-capacity minibus serving Lagos–Ibadan interstate routes daily.", specs: "14-seater • Diesel • 22 MPG" },
    { name: "Ford Transit 2022", images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80"], desc: "Versatile van used for goods delivery and inter-city passenger transport.", specs: "15-seater • Diesel • 26 MPG" },
    { name: "Hiace Bus Fleet 2020", images: ["https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=600&q=80", "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?w=600&q=80"], desc: "Commercial fleet bus running Abuja–Kaduna and Enugu–Owerri routes.", specs: "18-seater • Diesel • 20 MPG" },
    { name: "Mercedes Sprinter 2021", images: ["https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600&q=80", "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&q=80"], desc: "Premium minibus for executive airport shuttles and corporate charters.", specs: "12-seater • Diesel • 28 MPG" },
  ],
  truck: [
    { name: "Mack Truck 2019", images: ["https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80", "https://images.unsplash.com/photo-1519003300449-424ad0405076?w=600&q=80"], desc: "Heavy haulage truck serving oil sector logistics in the Niger Delta.", specs: "450HP • 40-ton capacity • Diesel" },
    { name: "DAF XF 2020", images: ["https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600&q=80", "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80"], desc: "Long-haul European truck running Lagos–Kano corridor with consistent loads.", specs: "530HP • 44-ton • Euro 6" },
    { name: "Howo A7 2021", images: ["https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=600&q=80", "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80"], desc: "Cost-effective dump truck widely used in Nigerian construction projects.", specs: "380HP • 30-ton • Diesel" },
    { name: "Mercedes Actros 2020", images: ["https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=600&q=80", "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80"], desc: "Premium semi-trailer hauling cement, fertilizer, and FMCG goods.", specs: "510HP • 44-ton • Predictive Cruise" },
  ],
};

function VehicleGallery({ images, name }: { images: string[]; name: string }) {
  const safeImages = Array.isArray(images) && images.length > 0 ? images : ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80"];
  const [idx, setIdx] = useState(0);
  const safeIndex = Math.min(idx, safeImages.length - 1);
  return (
    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-100 group">
      <img src={safeImages[safeIndex]} alt={name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80"; }} />
      {safeImages.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx((safeIndex - 1 + safeImages.length) % safeImages.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); setIdx((safeIndex + 1) % safeImages.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {safeImages.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`} />)}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExploreAssets() {
  const { data: assets, isLoading } = useGetAssets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [investOpen, setInvestOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [investAmount, setInvestAmount] = useState("");

  const createInvestment = useCreateInvestment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const categories = ["All", "Cars", "Buses & Vans", "Trucks"];
  const catMap: Record<string, string> = { "Cars": "car", "Buses & Vans": "bus", "Trucks": "truck" };
  const catFilter = catMap[filter] || null;

  const availableAssets = Array.isArray(assets) ? assets.filter(Boolean) : [];
  const filteredAssets = availableAssets.filter(a => {
    const label = typeof a.label === "string" ? a.label : "";
    const description = typeof a.description === "string" ? a.description : "";
    const category = typeof a.category === "string" ? a.category : "";
    const query = search.toLowerCase();
    const ms = label.toLowerCase().includes(query) || description.toLowerCase().includes(query);
    const mc = !catFilter || category.toLowerCase() === catFilter;
    return ms && mc;
  });

  const handleInvest = () => {
    if (!selectedAsset) return;
    const amount = Number(investAmount);
    if (isNaN(amount) || amount < selectedAsset.entryAmount) {
      toast({ title: "Invalid amount", description: `Minimum is ${formatCurrency(selectedAsset.entryAmount)}`, variant: "destructive" });
      return;
    }
    createInvestment.mutate({ data: { assetId: selectedAsset.id, amount, lockDays: selectedAsset.durationDays } }, {
      onSuccess: () => {
        toast({ title: "Investment Successful!", description: `You invested ${formatCurrency(amount)} in ${selectedAsset.label}` });
        setInvestOpen(false);
        [getGetInvestmentsQueryKey(), getGetWalletQueryKey(), getGetDashboardSummaryQueryKey()].forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      },
      onError: (err: any) => toast({ title: "Investment Failed", description: err?.message || "Insufficient balance", variant: "destructive" }),
    });
  };

  const sectionDefs = [
    { label: "🚗 Cars", cat: "car", subtitle: "Economy & executive sedans for ride-hailing" },
    { label: "🚌 Buses & Vans", cat: "bus", subtitle: "Inter-city & airport shuttle fleets" },
    { label: "🚛 Heavy Duty Trucks", cat: "truck", subtitle: "Logistics & construction haulage" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <main className="container mx-auto px-4 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold mb-3">Explore Fleets</h1>
            <p className="text-lg text-muted-foreground">Browse real vehicles and invest in high-yield transport assets across Nigeria</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 h-14 rounded-2xl bg-white border-none shadow-sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map(cat => (
                <Button key={cat} variant={filter === cat ? "default" : "outline"} onClick={() => setFilter(cat)}
                  className={`rounded-2xl h-14 px-6 font-semibold shrink-0 ${filter === cat ? "shadow-md shadow-primary/20" : "bg-white border-none shadow-sm text-foreground"}`}>
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-80 rounded-3xl" />)}</div>
          ) : (
            sectionDefs.map(sec => {
              const sectionAssets = filteredAssets?.filter(a => a.category === sec.cat) || [];
              if (sectionAssets.length === 0 && catFilter && catFilter !== sec.cat) return null;
              if (filter !== "All" && catMap[filter] !== sec.cat) return null;
              return (
                <section key={sec.cat} className="mb-14">
                  <div className="flex items-center gap-3 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{sec.label}</h2>
                      <p className="text-muted-foreground text-sm">{sec.subtitle}</p>
                    </div>
                  </div>

                  {sectionAssets.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 text-muted-foreground">No matching assets found</div>
                  ) : sectionAssets.map(asset => (
                    <div key={asset.id} className="mb-8">
                      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-xl">{asset.label}</h3>
                            <p className="text-muted-foreground text-sm mt-1">{asset.description}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <div className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-2">{asset.tag}</div>
                            <div className="text-green-600 font-bold">{formatPercentage(asset.returnRate)} returns</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {[
                            { label: "Min. Entry", value: formatCurrency(asset.entryAmount) },
                            { label: "Duration", value: `${asset.durationDays} days` },
                            { label: "Slots Left", value: `${asset.totalSlots - asset.slotsUsed}/${asset.totalSlots}` },
                          ].map(s => (
                            <div key={s.label} className="bg-gray-50 rounded-2xl p-3 text-center">
                              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                              <p className="font-bold text-sm">{s.value}</p>
                            </div>
                          ))}
                        </div>
                        <Progress value={(asset.slotsUsed / asset.totalSlots) * 100} className="h-2 mb-4" />
                        <Button className="w-full rounded-xl h-12 font-bold shadow-md shadow-primary/20"
                          onClick={() => { setSelectedAsset(asset); setInvestAmount(String(asset.entryAmount)); setInvestOpen(true); }}
                          disabled={asset.slotsUsed >= asset.totalSlots}>
                          {asset.slotsUsed >= asset.totalSlots ? "Fully Subscribed" : "Invest Now"}
                        </Button>
                      </div>

                      <p className="text-sm font-semibold text-muted-foreground mb-3">Available vehicles in this fleet:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(VEHICLE_CATALOG[sec.cat] || []).map(v => (
                          <div key={v.name} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
                            onClick={() => setSelectedVehicle(v)}>
                            <VehicleGallery images={v.images} name={v.name} />
                            <div className="p-3">
                              <p className="font-bold text-sm">{v.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{v.specs}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })
          )}
        </div>
      </main>

      <Dialog open={!!selectedVehicle} onOpenChange={o => !o && setSelectedVehicle(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          {selectedVehicle && (
            <>
              <DialogHeader><DialogTitle>{selectedVehicle.name}</DialogTitle></DialogHeader>
              <VehicleGallery images={selectedVehicle.images} name={selectedVehicle.name} />
              <p className="text-gray-600">{selectedVehicle.desc}</p>
              <div className="bg-gray-50 rounded-xl p-3 text-sm font-medium">{selectedVehicle.specs}</div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={investOpen} onOpenChange={setInvestOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          {selectedAsset && (
            <>
              <DialogHeader><DialogTitle>Invest in {selectedAsset.label}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-600 mb-1">Return Rate</p>
                    <p className="font-bold text-green-700 text-lg">{formatPercentage(selectedAsset.returnRate)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-600 mb-1">Duration</p>
                    <p className="font-bold text-blue-700 text-lg">{selectedAsset.durationDays} days</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">Investment Amount (₦)</label>
                  <Input type="number" value={investAmount} onChange={e => setInvestAmount(e.target.value)}
                    min={selectedAsset.entryAmount} className="h-14 rounded-xl text-xl font-bold bg-gray-50 border-gray-200 text-center" />
                  <p className="text-xs text-muted-foreground mt-1">Minimum: {formatCurrency(selectedAsset.entryAmount)}</p>
                </div>
                {!!investAmount && Number(investAmount) >= selectedAsset.entryAmount && (
                  <div className="bg-primary/5 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-sm font-medium">Expected return</span>
                    <span className="font-bold text-green-600 text-lg">+{formatCurrency(Number(investAmount) * selectedAsset.returnRate / 100)}</span>
                  </div>
                )}
                <Button onClick={handleInvest} disabled={createInvestment.isPending} className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20">
                  {createInvestment.isPending ? "Processing..." : "Confirm Investment"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
