import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group-[.toaster]:w-[calc(100vw-2rem)] group-[.toaster]:max-w-[380px] group-[.toaster]:rounded-2xl group-[.toaster]:border-border/70 group-[.toaster]:bg-background/95 group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:shadow-[0_12px_30px_rgba(15,23,42,0.12)] group-[.toaster]:backdrop-blur-xl",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:leading-tight",
          description: "group-[.toast]:mt-1 group-[.toast]:text-xs group-[.toast]:leading-relaxed group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:rounded-lg group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:rounded-lg group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground group-[.toast]:opacity-100",
          success: "group-[.toaster]:border-emerald-200/80 group-[.toaster]:bg-emerald-50/95 dark:group-[.toaster]:border-emerald-900 dark:group-[.toaster]:bg-emerald-950/95",
          error: "group-[.toaster]:border-rose-200/80 group-[.toaster]:bg-rose-50/95 dark:group-[.toaster]:border-rose-900 dark:group-[.toaster]:bg-rose-950/95",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
