import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import AssetTierCard from "@/components/AssetTierCard";
import { useGetAssets } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExploreAssets() {
  const { data: assets, isLoading } = useGetAssets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const categories = ["All", "Car", "Bus", "Truck"];

  const filteredAssets = assets?.filter(asset => {
    const matchesSearch = asset.label.toLowerCase().includes(search.toLowerCase()) || asset.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !filter || filter === "All" || asset.category.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      
      <main className="container mx-auto px-4 pt-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Explore Fleets</h1>
            <p className="text-lg text-muted-foreground">Invest in high-yield transport assets across Nigeria</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search assets..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-white border-none shadow-sm text-base"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {categories.map(cat => (
                <Button 
                  key={cat} 
                  variant={filter === cat || (!filter && cat === "All") ? "default" : "outline"}
                  className={`rounded-2xl h-14 px-6 font-semibold shrink-0 ${filter === cat || (!filter && cat === "All") ? "shadow-md shadow-primary/20" : "bg-white border-none shadow-sm text-foreground"}`}
                  onClick={() => setFilter(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-80 rounded-3xl" />)}
            </div>
          ) : filteredAssets && filteredAssets.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map(asset => (
                <AssetTierCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No assets found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search term</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}