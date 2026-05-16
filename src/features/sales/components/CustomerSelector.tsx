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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Users className="h-4 w-4 text-primary" /> Pelanggan{" "}
            <span className="text-destructive normal-case">*</span>
          </CardTitle>
          <div className="flex rounded-lg border p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setCustomerMode("existing")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                customerMode === "existing"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pilih
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("manual")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                customerMode === "manual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {customerMode === "existing" ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm transition-colors hover:bg-accent/50 ${
                  !customerId ? "border-destructive" : "border-input"
                }`}
              >
                <span className={customerId ? "text-foreground" : "text-muted-foreground"}>
                  {selectedCustomer
                    ? `${selectedCustomer.name} - ${selectedCustomer.phone ?? ""}`
                    : "Pilih pelanggan"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari nama / telepon..." />
                <CommandList>
                  <CommandEmpty>Pelanggan tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    {customers?.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.phone ?? ""}`}
                        onSelect={() => {
                          setCustomerId(c.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 shrink-0 ${
                            customerId === c.id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pelanggan"
                className={`h-9 text-sm ${!customerName.trim() ? "border-destructive" : ""}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telepon</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alamat</Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Alamat pengiriman"
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
