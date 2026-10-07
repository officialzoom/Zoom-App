import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import { useGetAssets } from "@/lib/firebase-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/formatting";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateInvestment, getGetInvestmentsQueryKey, getGetWalletQueryKey, getGetDashboardSummaryQueryKey } from "@/lib/firebase-api";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

// A single polished, real photograph represents each vehicle class so the
// fleet grid stays light while every model is individually priced below.
const FLEET_HERO =
  "https://media.base44.com/images/public/6abdad8b1f1e4a143ebf1cb7/a48a6aa1d_generated_f38c767c.png";

interface Vehicle {
  name: string;
  image: string;
  desc: string;
  specs: string;
  entryAmount: number;
  returnRate: number;
  durationDays: number;
  tag: string;
}

// All entry amounts capped at ₦30,000 to keep the platform accessible.
const VEHICLE_CATALOG: Record<string, Vehicle[]> = {
  car: [
    { name: "Toyota Highlander", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/2011_Toyota_Highlander_%28XU40%29_IMG_9722.jpg/960px-2011_Toyota_Highlander_%28XU40%29_IMG_9722.jpg", desc: "Executive 7-seater SUV for corporate hire and premium ride-hailing in Abuja & Lagos.", specs: "3.5L V6 • AWD • 7-seater", entryAmount: 10000, returnRate: 16, durationDays: 240, tag: "Executive" },
    { name: "Toyota Prado", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Toyota_Land_Cruiser_Prado%2C_Baku_%28P1090223%29.jpg/960px-Toyota_Land_Cruiser_Prado%2C_Baku_%28P1090223%29.jpg", desc: "Legendary all-terrain SUV with strong resale value and steady executive demand.", specs: "2.8L Turbo Diesel • 4WD", entryAmount: 15000, returnRate: 18, durationDays: 270, tag: "Premium" },
    { name: "Toyota Land Cruiser", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/TOYOTA_LAND_CRUISER_200_China_%283%29.jpg/960px-TOYOTA_LAND_CRUISER_200_China_%283%29.jpg", desc: "Flagship luxury 4WD for executive transport and oil & gas field operations.", specs: "4.5L V8 • AWD • Luxury", entryAmount: 25000, returnRate: 20, durationDays: 365, tag: "Flagship" },
    { name: "Lexus RX 300", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Lexus_RX_450h%2B_%28AALH16%29_1X7A1930.jpg/960px-Lexus_RX_450h%2B_%28AALH16%29_1X7A1930.jpg", desc: "Comfort-first luxury crossover favoured by executive airport transfers.", specs: "3.0L V6 • Auto • Luxury", entryAmount: 12000, returnRate: 15, durationDays: 240, tag: "Luxury" },
    { name: "Nissan Pathfinder", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Nissan_Pathfinder_Rock_Creek_%28R53%29_AMA_Marbach_2025_DSC_8665.jpg/960px-Nissan_Pathfinder_Rock_Creek_%28R53%29_AMA_Marbach_2025_DSC_8665.jpg", desc: "Spacious 7-seater SUV with low maintenance, ideal for family and commercial hire.", specs: "3.5L V6 • AWD • 7-seater", entryAmount: 8000, returnRate: 15, durationDays: 210, tag: "Reliable" },
    { name: "Mercedes GLK", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/MERCEDES-BENZ_GLK-CLASS_%28X204%29_China_%2814%29.jpg/960px-MERCEDES-BENZ_GLK-CLASS_%28X204%29_China_%2814%29.jpg", desc: "Compact German luxury SUV for chauffeured executive and diplomatic hire.", specs: "2.1L Turbo • Auto • 4MATIC", entryAmount: 10000, returnRate: 16, durationDays: 240, tag: "Executive" },
    { name: "Range Rover Sport", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Range_Rover_Sport_Series_III_IMG_9449.jpg/960px-Range_Rover_Sport_Series_III_IMG_9449.jpg", desc: "High-performance luxury SUV for premium VIP transport fleets.", specs: "3.0L V6 • Auto • 4WD", entryAmount: 20000, returnRate: 19, durationDays: 365, tag: "VIP" },
    { name: "Range Rover Vogue", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/LAND_ROVER_RANGE_ROVER_%28L460%29_China.jpg/960px-LAND_ROVER_RANGE_ROVER_%28L460%29_China.jpg", desc: "British flagship luxury SUV for top-tier corporate and government contracts.", specs: "3.0L V6 • Auto • Luxury", entryAmount: 25000, returnRate: 19, durationDays: 365, tag: "Flagship" },
    { name: "Ford Escape", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Ford_Escape_%28fourth_generation%29_1X7A6220.jpg/960px-Ford_Escape_%28fourth_generation%29_1X7A6220.jpg", desc: "Efficient compact SUV for urban ride-hailing and family mobility.", specs: "2.5L • Auto • AWD", entryAmount: 5000, returnRate: 14, durationDays: 180, tag: "Efficient" },
  ],
  bus: [
    { name: "Keke Napep", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Keke_Napep.jpg/960px-Keke_Napep.jpg", desc: "Affordable intra-city tricycle for high-turnover last-mile routes.", specs: "3-wheeler • Petrol • 3-seat", entryAmount: 2000, returnRate: 22, durationDays: 120, tag: "High Turnover" },
    { name: "Danfo", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Lagos_Danfo_Bus.jpg/960px-Lagos_Danfo_Bus.jpg", desc: "Classic Lagos commuter bus with reliable daily route revenue.", specs: "VW Bus • Petrol • ~12-seat", entryAmount: 3000, returnRate: 18, durationDays: 150, tag: "Commuters" },
    { name: "Volkswagen T2/T3 Bus", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/VW_T3_%2834603169343%29.jpg/960px-VW_T3_%2834603169343%29.jpg", desc: "Iconic people-mover for routes and organised transport unions.", specs: "VW T2/T3 • Petrol • Multi-seat", entryAmount: 5000, returnRate: 17, durationDays: 180, tag: "Classic" },
    { name: "Hiace White", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/2017_Toyota_HiAce_%28TRH201R%29_LWB_van_%282018-10-01%29_01.jpg/960px-2017_Toyota_HiAce_%28TRH201R%29_LWB_van_%282018-10-01%29_01.jpg", desc: "White Toyota HiAce van, the workhorse of Nigerian shuttle and delivery.", specs: "2.7L • Diesel • 14-seat", entryAmount: 5000, returnRate: 20, durationDays: 180, tag: "Workhorse" },
    { name: "Toyota Hiace (Hummer Bus)", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/2017_Toyota_HiAce_%28TRH201R%29_LWB_van_%282018-10-01%29_01.jpg/960px-2017_Toyota_HiAce_%28TRH201R%29_LWB_van_%282018-10-01%29_01.jpg", desc: "Upgraded HiAce patched into the popular 'Hummer bus' long-distance format.", specs: "Diesel • ~18-seat • Interstate", entryAmount: 8000, returnRate: 21, durationDays: 210, tag: "Interstate" },
    { name: "Ford Transit", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Ford_Transit_Courier%2C_Nufam_2023%2C_Rheinstetten_%28P1130550%29.jpg/960px-Ford_Transit_Courier%2C_Nufam_2023%2C_Rheinstetten_%28P1130550%29.jpg", desc: "Versatile van for goods delivery and city passenger shuttles.", specs: "Diesel • ~15-seat", entryAmount: 5000, returnRate: 18, durationDays: 180, tag: "Versatile" },
    { name: "Toyota Coaster (30 Seater)", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Toyota_Coaster_Fuelcell_bus_and_regular_Toyota_Coaster.jpg/960px-Toyota_Coaster_Fuelcell_bus_and_regular_Toyota_Coaster.jpg", desc: "Reliable 30-seater for inter-city routes, schools and corporate shuttles.", specs: "Diesel • 30-seat", entryAmount: 12000, returnRate: 23, durationDays: 240, tag: "Interstate" },
    { name: "Hummer Bus Extended", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Dublin_Bus_EW_Class_StreetDeck_Electroliner_BEV.jpg/960px-Dublin_Bus_EW_Class_StreetDeck_Electroliner_BEV.jpg", desc: "Extended 33-seat people-carrier dominating long-distance routes in Nigeria.", specs: "Diesel • 33-seat • Extended", entryAmount: 15000, returnRate: 24, durationDays: 270, tag: "High Capacity" },
    { name: "Marcopolo", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Marcopolo_Gran_Viale_bus_in_Santiago_de_Chile_%28413c%29.jpg/960px-Marcopolo_Gran_Viale_bus_in_Santiago_de_Chile_%28413c%29.jpg", desc: "Premium Brazilian-bodied coach for interstate luxury transport.", specs: "Diesel • ~45-seat • Luxury", entryAmount: 18000, returnRate: 25, durationDays: 365, tag: "Luxury Coach" },
    { name: "Toyota Luxury Interstate Bus", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Five_Star_Bus_88071.jpg/960px-Five_Star_Bus_88071.jpg", desc: "Luxury coach for premium express brands (God is Good style interstate service).", specs: "Diesel • ~33-seat • Premium", entryAmount: 20000, returnRate: 26, durationDays: 365, tag: "Premium" },
    { name: "Toyota Sienna", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Toyota_Sienna_%28XL30%29_DSC_2916.jpg/960px-Toyota_Sienna_%28XL30%29_DSC_2916.jpg", desc: "Comfortable station-wagon minivan for executive airport transfers.", specs: "3.5L V6 • Auto • 7/8-seat", entryAmount: 10000, returnRate: 17, durationDays: 240, tag: "Executive" },
  ],
  truck: [
    { name: "Toyota Hilux", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Toyota_HiLux_GR_Sport_1X7A7281.jpg/960px-Toyota_HiLux_GR_Sport_1X7A7281.jpg", desc: "The definitive pickup for delivery, farms and rugged site movement.", specs: "2.8L Turbo Diesel • 4x4", entryAmount: 8000, returnRate: 20, durationDays: 210, tag: "Legendary" },
    { name: "Ford Ranger", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Ford_Ranger_%28T6%2C_P703%29_Wildtrak_IMG_7320.jpg/960px-Ford_Ranger_%28T6%2C_P703%29_Wildtrak_IMG_7320.jpg", desc: "Robust double-cab pickup for logistics and utility operations.", specs: "2.0L Turbo Diesel • 4x4", entryAmount: 10000, returnRate: 20, durationDays: 210, tag: "Robust" },
    { name: "Mitsubishi Canter", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Nufam_2023%2C_Rheinstetten_%28P1130698%29.jpg/960px-Nufam_2023%2C_Rheinstetten_%28P1130698%29.jpg", desc: "Compact delivery truck for urban goods distribution and small haulage.", specs: "3.0L Diesel • ~3.5t", entryAmount: 5000, returnRate: 18, durationDays: 180, tag: "Delivery" },
    { name: "Howo Sinotruk", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/CNHTC_Howo%2C_Atimpoku_%28P1090965%29.jpg/960px-CNHTC_Howo%2C_Atimpoku_%28P1090965%29.jpg", desc: "Chinese heavy truck widely used in construction and quarry work.", specs: "380HP • ~30t • Diesel", entryAmount: 20000, returnRate: 27, durationDays: 300, tag: "Construction" },
    { name: "Mack Dump Truck", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Mack_B-61_dump_truck_PA2.jpg/960px-Mack_B-61_dump_truck_PA2.jpg", desc: "Muscular American dump truck for mining and heavy civil works.", specs: "450HP • Tipper", entryAmount: 30000, returnRate: 30, durationDays: 365, tag: "Heavy Duty" },
    { name: "Mercedes 911", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Mercedes-Benz_LA_911B_of_the_U.S._Air_Force.JPEG/960px-Mercedes-Benz_LA_911B_of_the_U.S._Air_Force.JPEG", desc: "The classic 'Molue' engine workhorse — strong, simple and durable for haulage.", specs: "Diesel • ~15t", entryAmount: 25000, returnRate: 29, durationDays: 365, tag: "Workhorse" },
    { name: "DAF", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/DAF_LF_2005.jpg/960px-DAF_LF_2005.jpg", desc: "European long-haul truck for consistent Lagos–Kano freight runs.", specs: "Diesel • 44t • Euro 6", entryAmount: 22000, returnRate: 26, durationDays: 330, tag: "Long-haul" },
    { name: "Mack Granite", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Steam_Whistle_Mack_truck_20110613-IMG_3584.JPG/960px-Steam_Whistle_Mack_truck_20110613-IMG_3584.JPG", desc: "Premium American dump/trailer hauler for cement, stone and heavy freight.", specs: "Mack MP7/MP8 • Tipper", entryAmount: 30000, returnRate: 31, durationDays: 365, tag: "Heavy Duty" },
    { name: "MAN", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/MAN_truck%2C_Atimpoku_%28P1100011%29.jpg/960px-MAN_truck%2C_Atimpoku_%28P1100011%29.jpg", desc: "German reliability for long-distance cargo and tanker operations.", specs: "Diesel • 44t", entryAmount: 25000, returnRate: 27, durationDays: 330, tag: "Reliable" },
    { name: "DAF CF", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/DAF_CF_mit_11_cbm-Abrollmulde.jpg/960px-DAF_CF_mit_11_cbm-Abrollmulde.jpg", desc: "Multi-purpose European rig for cargo and roll-off container haulage.", specs: "Diesel • ~40t", entryAmount: 25000, returnRate: 27, durationDays: 330, tag: "Multi-purpose" },
    { name: "Iveco Stralis", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Iveco_Stralis_2.jpg/960px-Iveco_Stralis_2.jpg", desc: "Italian long-haul truck for container and general freight logistics.", specs: "Diesel • 44t", entryAmount: 28000, returnRate: 28, durationDays: 365, tag: "Long-haul" },
    { name: "Howo", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/China_howo_truck_co.%2Cltd.jpg/960px-China_howo_truck_co.%2Cltd.jpg", desc: "Cost-effective Chinese tipper for construction and mining sites.", specs: "380HP • ~30t • Tipper", entryAmount: 22000, returnRate: 28, durationDays: 330, tag: "Construction" },
    { name: "Mercedes Actros", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Mercedes-Benz_Actros_L%2C_BAS_24%2C_Brussels_%28P1170411-RR%29.jpg/960px-Mercedes-Benz_Actros_L%2C_BAS_24%2C_Brussels_%28P1170411-RR%29.jpg", desc: "Flagman European semi-trailer hauling cement, fertilizer and FMCG goods.", specs: "510HP • 44t • Luxury cab", entryAmount: 28000, returnRate: 29, durationDays: 365, tag: "Logistics" },
  ],
};

function VehicleGallery({ images, name }: { images: string[]; name: string }) {
  const safeImages = Array.isArray(images) && images.length > 0 ? images : ["https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Toyota_Land_Cruiser_Prado%2C_Baku_%28P1090223%29.jpg/960px-Toyota_Land_Cruiser_Prado%2C_Baku_%28P1090223%29.jpg"];
  const [idx, setIdx] = useState(0);
  const safeIndex = Math.min(idx, safeImages.length - 1);
  return (
    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-100 group">
      <img src={safeImages[safeIndex]} alt={name} className="w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).src = safeImages[0]; }} />
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
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [investOpen, setInvestOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [investDays, setInvestDays] = useState(30);

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

  // Vehicle catalog search respects the same search + category filter.
  const filteredVehicles = (cat: string) => {
    const list = VEHICLE_CATALOG[cat] || [];
    const query = search.toLowerCase();
    return list.filter(v => !query || v.name.toLowerCase().includes(query));
  };

  const MAX_INVESTMENT = 30000;

  const handleInvest = () => {
    if (!selectedAsset) return;
    const amount = Number(investAmount);
    const days = Number(investDays);
    if (isNaN(amount) || amount < selectedAsset.entryAmount) {
      toast({ title: "Invalid amount", description: `Minimum is ${formatCurrency(selectedAsset.entryAmount)}`, variant: "destructive" });
      return;
    }
    if (amount > MAX_INVESTMENT) {
      toast({ title: "Amount too high", description: `Maximum investment is ${formatCurrency(MAX_INVESTMENT)} to keep the platform accessible.`, variant: "destructive" });
      return;
    }
    if (!Number.isInteger(days) || days < 1) {
      toast({ title: "Invalid duration", description: "Choose at least 1 investment day.", variant: "destructive" });
      return;
    }
    if (days > selectedAsset.durationDays) {
      toast({
        title: "Duration too long",
        description: `Maximum duration for this asset is ${selectedAsset.durationDays} days.`,
        variant: "destructive",
      });
      return;
    }
    createInvestment.mutate({ data: { assetId: selectedAsset.id, amount, lockDays: days } }, {
      onSuccess: () => {
        toast({ title: "Investment Successful!", description: `You invested ${formatCurrency(amount)} in ${selectedAsset.label}` });
        setInvestOpen(false);
        [getGetInvestmentsQueryKey(), getGetWalletQueryKey(), getGetDashboardSummaryQueryKey()].forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      },
      onError: (err: any) => toast({ title: "Investment Failed", description: err?.message || "Insufficient balance", variant: "destructive" }),
    });
  };

  const sectionDefs = [
    { label: "Cars, SUVs & Jeeps", cat: "car", subtitle: "Executive mobility, ride-hailing & corporate hire" },
    { label: "Buses & Vans", cat: "bus", subtitle: "City routes, shuttles & interstate transport" },
    { label: "Trucks & Heavy Duty", cat: "truck", subtitle: "Delivery, construction & long-haul haulage" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <main className="container mx-auto px-4 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold mb-3">Explore Fleets</h1>
            <p className="text-lg text-muted-foreground">Browse real vehicles and invest in high-yield transport assets across Nigeria</p>
            <div className="mt-6 mx-auto max-w-4xl rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <img src={FLEET_HERO} alt="Zoom NG commercial fleet" className="w-full h-56 md:h-72 object-cover" loading="lazy" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search assets or vehicles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 h-14 rounded-2xl bg-white border-none shadow-sm" />
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
              const vehicles = filteredVehicles(sec.cat);
              return (
                <section key={sec.cat} className="mb-14">
                  <div className="flex items-center gap-3 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{sec.label}</h2>
                      <p className="text-muted-foreground text-sm">{sec.subtitle}</p>
                    </div>
                  </div>

                  {sectionAssets.length === 0 && vehicles.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 text-muted-foreground">No matching assets found</div>
                  ) : (
                    <>
                      {sectionAssets.length > 0 && sectionAssets.map(asset => (
                        <div key={asset.id} className="mb-8">
                          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
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
                              onClick={() => { setSelectedAsset(asset); setInvestAmount(String(asset.entryAmount)); setInvestDays(asset.durationDays); setInvestOpen(true); }}
                              disabled={asset.slotsUsed >= asset.totalSlots}>
                              {asset.slotsUsed >= asset.totalSlots ? "Fully Subscribed" : "Invest Now"}
                            </Button>
                          </div>
                        </div>
                      ))}

                      <p className="text-sm font-semibold text-muted-foreground mb-3">Available vehicles in this fleet:</p>
                      {vehicles.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 text-muted-foreground">No vehicles match your search</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {vehicles.map(v => (
                            <div key={v.name} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
                              onClick={() => setSelectedVehicle(v)}>
                              <VehicleGallery images={[v.image]} name={v.name} />
                              <div className="p-3">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <p className="font-bold text-sm leading-tight">{v.name}</p>
                                  <span className="shrink-0 text-[10px] font-bold bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">{v.returnRate}%</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">{v.specs}</p>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                  <span className="font-bold text-sm">{formatCurrency(v.entryAmount)}</span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{v.durationDays}d</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
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
              <VehicleGallery images={[selectedVehicle.image]} name={selectedVehicle.name} />
              <p className="text-gray-600">{selectedVehicle.desc}</p>
              <div className="bg-gray-50 rounded-xl p-3 text-sm font-medium">
                {selectedVehicle.specs} • Entry: {formatCurrency(selectedVehicle.entryAmount)} • Return: {selectedVehicle.returnRate}% • {selectedVehicle.durationDays} days
              </div>
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
                    min={selectedAsset.entryAmount} max={30000} className="h-14 rounded-xl text-xl font-bold bg-gray-50 border-gray-200 text-center" />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">Min: {formatCurrency(selectedAsset.entryAmount)}</p>
                    <button className="text-xs font-semibold text-primary hover:underline" onClick={() => setInvestAmount("30000")}>Max: {formatCurrency(30000)}</button>
                  </div>
                </div>
                <div>
                  <label htmlFor="investment-days" className="text-sm font-semibold block mb-2">Investment duration (days)</label>
                  <Input id="investment-days" type="number" value={investDays} onChange={e => setInvestDays(Number(e.target.value))}
                    min={1} max={selectedAsset.durationDays} step={1} className="h-12 rounded-xl bg-gray-50 border-gray-200 text-center" />
                  <p className="text-xs text-muted-foreground mt-1">Choose up to {selectedAsset.durationDays} days.</p>
                </div>
                {!!investAmount && Number(investAmount) >= selectedAsset.entryAmount && investDays > 0 && (
                  <div className="bg-primary/5 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-sm font-medium">Projected profit</span>
                    <span className="font-bold text-green-600 text-lg">+{formatCurrency(Number(investAmount) * (selectedAsset.returnRate / 100) * Math.min(investDays / selectedAsset.durationDays, 1))}</span>
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