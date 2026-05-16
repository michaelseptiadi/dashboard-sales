import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.ComponentProps<typeof Input> {
  containerClassName?: string;
}

export function SearchInput({ containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input className={cn("pl-9", className)} {...props} />
    </div>
  );
}
