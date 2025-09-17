import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap select-none rounded-xl text-sm font-medium transition-transform duration-300 ease-out will-change-transform ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.97]",
	{
		variants: {
			variant: {
				default: "btn-sky",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/80",
				outline:
					"border border-sky-200/50 bg-background/90 backdrop-blur-sm text-foreground hover:border-sky-300 hover:bg-sky-50/80 hover:text-sky-800 dark:border-slate-600/60 dark:hover:border-sky-500/50 dark:hover:bg-slate-800/70",
				secondary:
					"bg-secondary text-secondary-foreground shadow-[0_8px_25px_-18px_rgba(56,189,248,0.55)] hover:bg-secondary/75",
				ghost:
					"text-foreground hover:text-sky-600 hover:bg-sky-50/70 dark:hover:bg-slate-800/70",
				link: "text-primary underline-offset-4 hover:underline",
				sky: "btn-sky",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3",
				lg: "h-11 rounded-md px-8",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	isLoading?: boolean;
	children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			children,
			isLoading = false,
			asChild = false,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		return (
			<>
				<Comp
					className={cn(
						buttonVariants({ variant, size, className }),
						"flex gap-2",
					)}
					ref={ref}
					{...props}
					disabled={isLoading || props.disabled}
				>
					{isLoading && <Loader2 className="animate-spin" />}
					<Slottable>{children}</Slottable>
				</Comp>
			</>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
