import { useState } from "react";
import { Users, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface CustomerSelectorProps {
  customerMode: "existing" | "manual";
  setCustomerMode: (mode: "existing" | "manual") => void;
  customerId: string;
  setCustomerId: (id: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (addr: string) => void;
  customers?: Customer[];
}

export function CustomerSelector({
  customerMode,
  setCustomerMode,
  customerId,
  setCustomerId,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  customers,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedCustomer = customers?.find((c) => c.id === customerId);

  return (
    <Card className="border-muted/50 shadow-sm hover:shadow-md/40 transition-all duration-300 rounded-2xl overflow-hidden bg-card/65 backdrop-blur-md">
      <CardHeader className="pb-4 border-b border-muted/20 bg-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <span>Pelanggan</span>
            <span className="text-destructive normal-case font-bold">*</span>
          </CardTitle>
          <div className="flex rounded-full bg-secondary/80 p-1 gap-1 border border-muted/20 shadow-inner">
            <button
              type="button"
              onClick={() => setCustomerMode("existing")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-300 ${
                customerMode === "existing"
                  ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cari
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("manual")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-300 ${
                customerMode === "manual"
                  ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {customerMode === "existing" ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm font-medium transition-all duration-200 hover:bg-accent/40 border-input hover:border-muted-foreground/35"
              >
                <span className="text-foreground font-medium">
                  {selectedCustomer
                    ? `${selectedCustomer.name} ${selectedCustomer.phone ? `(${selectedCustomer.phone})` : ""}`
                    : "Pelanggan Walk-in (Umum)"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl overflow-hidden shadow-lg border-muted/40" align="start">
              <Command className="rounded-xl">
                <CommandInput placeholder="Cari nama atau nomor telepon..." className="h-10" />
                <CommandList>
                  <CommandEmpty className="py-4 text-sm text-center text-muted-foreground">Pelanggan tidak ditemukan.</CommandEmpty>
                  <CommandGroup className="p-1">
                    <CommandItem
                      value="Walk-in Customer Umum"
                      onSelect={() => {
                        setCustomerId("");
                        setOpen(false);
                      }}
                      className="rounded-lg py-2 border-b border-muted/10"
                    >
                      <Check
                        className={`mr-2.5 h-4 w-4 shrink-0 text-primary ${
                          !customerId ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Pelanggan Walk-in (Umum)</span>
                        <span className="text-xs text-muted-foreground">Transaksi langsung tanpa data</span>
                      </div>
                    </CommandItem>
                    {customers?.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.phone ?? ""}`}
                        onSelect={() => {
                          setCustomerId(c.id);
                          setOpen(false);
                        }}
                        className="rounded-lg py-2"
                      >
                        <Check
                          className={`mr-2.5 h-4 w-4 shrink-0 text-primary ${
                            customerId === c.id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{c.name}</span>
                          {c.phone && <span className="text-xs text-muted-foreground font-mono">{c.phone}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Nama Lengkap <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pelanggan..."
                className={`h-10 rounded-xl text-sm ${!customerName.trim() ? "border-destructive/80 focus:ring-destructive" : "hover:border-muted-foreground/35"}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Telepon</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="h-10 rounded-xl text-sm hover:border-muted-foreground/35"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Alamat</Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Alamat lengkap..."
                className="h-10 rounded-xl text-sm hover:border-muted-foreground/35"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
